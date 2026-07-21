import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, Transaction } from 'kysely';
import { KYSELY } from '../db/database.module';
import { AdaptationType, Database } from '../db/types';
import { AdaptRecipeDto } from './dto/adapt-recipe.dto';
import { CreateRecipeDto, RecipeStepInputDto } from './dto/create-recipe.dto';
import { aggregate, MacroTotals, per100g, perServing, resolveIngredients, ResolvedIngredient } from './macro-calculator';

@Injectable()
export class RecipesService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async createRecipe(authorId: string, dto: CreateRecipeDto) {
    return this.db.transaction().execute(async (trx) => {
      const resolved = await resolveIngredients(trx, dto.ingredients);
      const totals = aggregate(resolved);
      const servings = dto.servings ?? 1;

      const recipe = await trx
        .insertInto('recipes')
        .values({
          author_id: authorId,
          title: dto.title,
          description: dto.description ?? null,
          servings,
          status: dto.publish ? 'publiee' : 'brouillon',
          visibility: 'publique',
          total_calories_kcal: totals.calories,
          total_protein_g: totals.protein,
          total_carbs_g: totals.carbs,
          total_fat_g: totals.fat,
          total_fiber_g: totals.fiber,
          total_sugar_g: totals.sugar,
          total_saturated_fat_g: totals.saturatedFat,
          total_salt_g: totals.salt,
          published_at: dto.publish ? new Date() : null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await this.insertIngredients(trx, recipe.id, resolved);
      if (dto.steps?.length) await this.insertSteps(trx, recipe.id, dto.steps);

      return this.toResponse(recipe, resolved, totals);
    });
  }

  async getRecipe(id: string) {
    const recipe = await this.db.selectFrom('recipes').selectAll().where('id', '=', id).executeTakeFirst();
    if (!recipe || recipe.deleted_at) {
      throw new NotFoundException('Recette introuvable.');
    }

    const ingredientRows = await this.db
      .selectFrom('recipe_ingredients')
      .select(['food_id', 'quantity', 'unit', 'note', 'replaced_food_id'])
      .where('recipe_id', '=', id)
      .orderBy('sort_order')
      .execute();

    const steps = await this.db
      .selectFrom('recipe_steps')
      .select(['step_number', 'instruction', 'photo_url'])
      .where('recipe_id', '=', id)
      .orderBy('step_number')
      .execute();

    const resolved = await resolveIngredients(
      this.db,
      ingredientRows.map((r) => ({
        foodId: r.food_id,
        quantity: r.quantity,
        unit: r.unit,
        note: r.note ?? undefined,
        replacedFoodId: r.replaced_food_id ?? undefined,
      })),
    );
    const totals = aggregate(resolved);

    const adaptedCount = await this.db
      .selectFrom('recipes')
      .select(({ fn }) => fn.countAll().as('count'))
      .where('original_recipe_id', '=', id)
      .executeTakeFirstOrThrow();

    return { ...this.toResponse(recipe, resolved, totals), steps, adaptedCount: Number(adaptedCount.count) };
  }

  async listFeed(limit = 20) {
    const rows = await this.db
      .selectFrom('recipes')
      .innerJoin('users', 'users.id', 'recipes.author_id')
      .select([
        'recipes.id',
        'recipes.title',
        'recipes.cover_photo_url',
        'recipes.servings',
        'recipes.prep_time_minutes',
        'recipes.total_calories_kcal',
        'recipes.total_protein_g',
        'recipes.total_carbs_g',
        'recipes.total_fat_g',
        'recipes.original_recipe_id',
        'recipes.created_at',
        'users.pseudo as author_pseudo',
        ({ selectFrom, fn }) =>
          selectFrom('recipe_likes')
            .select(fn.countAll().as('count'))
            .whereRef('recipe_likes.recipe_id', '=', 'recipes.id')
            .as('like_count'),
        ({ selectFrom, fn }) =>
          selectFrom('recipe_saves')
            .select(fn.countAll().as('count'))
            .whereRef('recipe_saves.recipe_id', '=', 'recipes.id')
            .as('save_count'),
      ])
      .where('recipes.status', '=', 'publiee')
      .where('recipes.visibility', '=', 'publique')
      .where('recipes.deleted_at', 'is', null)
      .orderBy('recipes.created_at', 'desc')
      .limit(limit)
      .execute();

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      coverPhotoUrl: r.cover_photo_url,
      servings: r.servings,
      prepTimeMinutes: r.prep_time_minutes,
      author: r.author_pseudo,
      isAdaptation: r.original_recipe_id !== null,
      likeCount: Number(r.like_count),
      saveCount: Number(r.save_count),
      macros: {
        calories: r.total_calories_kcal,
        protein: r.total_protein_g,
        carbs: r.total_carbs_g,
        fat: r.total_fat_g,
      },
    }));
  }

  async adaptRecipe(userId: string, originalId: string, dto: AdaptRecipeDto) {
    const original = await this.db
      .selectFrom('recipes')
      .selectAll()
      .where('id', '=', originalId)
      .executeTakeFirst();
    if (!original || original.deleted_at) {
      throw new NotFoundException('Recette introuvable.');
    }
    if (original.visibility === 'privee' && original.author_id !== userId) {
      throw new ForbiddenException("Cette recette n'est pas accessible.");
    }

    return this.db.transaction().execute(async (trx) => {
      const resolved = await resolveIngredients(trx, dto.ingredients);
      const totals = aggregate(resolved);
      const servings = dto.servings ?? original.servings;

      const adaptationType: AdaptationType = dto.ingredients.some((i) => i.replacedFoodId)
        ? 'substitution_ingredient'
        : dto.servings && dto.servings !== original.servings
          ? 'portions'
          : 'grammage';

      const adapted = await trx
        .insertInto('recipes')
        .values({
          author_id: userId,
          title: dto.title ?? original.title,
          description: original.description,
          category_id: original.category_id,
          meal_category: original.meal_category,
          difficulty: original.difficulty,
          prep_time_minutes: original.prep_time_minutes,
          cook_time_minutes: original.cook_time_minutes,
          servings,
          status: 'publiee',
          visibility: dto.visibility ?? 'privee',
          original_recipe_id: originalId,
          adaptation_type: adaptationType,
          total_calories_kcal: totals.calories,
          total_protein_g: totals.protein,
          total_carbs_g: totals.carbs,
          total_fat_g: totals.fat,
          total_fiber_g: totals.fiber,
          total_sugar_g: totals.sugar,
          total_saturated_fat_g: totals.saturatedFat,
          total_salt_g: totals.salt,
          published_at: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await this.insertIngredients(trx, adapted.id, resolved);

      const originalSteps = await trx
        .selectFrom('recipe_steps')
        .select(['step_number', 'instruction', 'photo_url'])
        .where('recipe_id', '=', originalId)
        .orderBy('step_number')
        .execute();
      if (originalSteps.length) {
        await trx
          .insertInto('recipe_steps')
          .values(
            originalSteps.map((s) => ({
              recipe_id: adapted.id,
              step_number: s.step_number,
              instruction: s.instruction,
              photo_url: s.photo_url,
            })),
          )
          .execute();
      }

      return {
        ...this.toResponse(adapted, resolved, totals),
        originalRecipeId: originalId,
        diffVsOriginal: {
          calories: round(totals.calories - original.total_calories_kcal),
          protein: round(totals.protein - original.total_protein_g),
          carbs: round(totals.carbs - original.total_carbs_g),
          fat: round(totals.fat - original.total_fat_g),
        },
      };
    });
  }

  async like(userId: string, recipeId: string) {
    await this.db
      .insertInto('recipe_likes')
      .values({ user_id: userId, recipe_id: recipeId })
      .onConflict((oc) => oc.columns(['user_id', 'recipe_id']).doNothing())
      .execute();
    return { liked: true };
  }

  async unlike(userId: string, recipeId: string) {
    await this.db.deleteFrom('recipe_likes').where('user_id', '=', userId).where('recipe_id', '=', recipeId).execute();
    return { liked: false };
  }

  async save(userId: string, recipeId: string) {
    await this.db
      .insertInto('recipe_saves')
      .values({ user_id: userId, recipe_id: recipeId })
      .onConflict((oc) => oc.columns(['user_id', 'recipe_id']).doNothing())
      .execute();
    return { saved: true };
  }

  async unsave(userId: string, recipeId: string) {
    await this.db.deleteFrom('recipe_saves').where('user_id', '=', userId).where('recipe_id', '=', recipeId).execute();
    return { saved: false };
  }

  // Marque la recette comme cuisinée maintenant (espace personnel : "j'ai
  // fait cette recette"). Plusieurs événements par jour sont autorisés.
  async markCooked(userId: string, recipeId: string) {
    const event = await this.db
      .insertInto('recipe_cook_events')
      .values({ user_id: userId, recipe_id: recipeId })
      .returning(['id', 'cooked_at'])
      .executeTakeFirstOrThrow();
    return event;
  }

  private async insertIngredients(
    trx: Transaction<Database>,
    recipeId: string,
    resolved: ResolvedIngredient[],
  ) {
    await trx
      .insertInto('recipe_ingredients')
      .values(
        resolved.map((r, index) => ({
          recipe_id: recipeId,
          food_id: r.foodId,
          quantity: r.quantity,
          unit: r.unit,
          sort_order: index,
          note: r.note ?? null,
          replaced_food_id: r.replacedFoodId ?? null,
        })),
      )
      .execute();
  }

  private async insertSteps(trx: Transaction<Database>, recipeId: string, steps: RecipeStepInputDto[]) {
    await trx
      .insertInto('recipe_steps')
      .values(
        steps.map((s) => ({
          recipe_id: recipeId,
          step_number: s.stepNumber,
          instruction: s.instruction,
        })),
      )
      .execute();
  }

  private toResponse(
    recipe: {
      id: string;
      title: string;
      description: string | null;
      servings: number;
      status: string;
      visibility: string;
      original_recipe_id: string | null;
      adaptation_type: string | null;
    },
    resolved: ResolvedIngredient[],
    totals: MacroTotals,
  ) {
    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      status: recipe.status,
      visibility: recipe.visibility,
      originalRecipeId: recipe.original_recipe_id,
      adaptationType: recipe.adaptation_type,
      ingredients: resolved.map((r) => ({
        foodId: r.foodId,
        name: r.food.name,
        state: r.food.state,
        quantity: r.quantity,
        unit: r.unit,
        grams: r.grams,
        note: r.note ?? null,
        replacedFoodId: r.replacedFoodId ?? null,
        // Valeurs pour 100 g renvoyées pour permettre au client de
        // recalculer les macros instantanément (fenêtre d'adaptation,
        // §5.4 du brief) sans round-trip serveur à chaque changement de
        // quantité.
        per100g: {
          calories: r.food.calories_kcal_per_100g,
          protein: r.food.protein_g_per_100g,
          carbs: r.food.carbs_g_per_100g,
          fat: r.food.fat_g_per_100g,
          fiber: r.food.fiber_g_per_100g,
          sugar: r.food.sugar_g_per_100g,
          saturatedFat: r.food.saturated_fat_g_per_100g,
          salt: r.food.salt_g_per_100g,
        },
      })),
      macros: {
        total: {
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          fiber: totals.fiber,
          sugar: totals.sugar,
          saturatedFat: totals.saturatedFat,
          salt: totals.salt,
        },
        perServing: perServing(totals, recipe.servings),
        per100g: per100g(totals),
      },
    };
  }
}

const round = (n: number) => Math.round(n * 100) / 100;
