import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, Selectable, sql } from 'kysely';
import { KYSELY } from '../db/database.module';
import { Database, FoodDiaryEntriesTable } from '../db/types';
import { aggregate, resolveIngredients } from '../recipes/macro-calculator';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { CreateFoodDiaryEntryDto } from './dto/food-diary-entry.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const round = (n: number) => Math.round(n * 100) / 100;

const RECIPE_SUMMARY_COLUMNS = [
  'recipes.id',
  'recipes.title',
  'recipes.cover_photo_url',
  'recipes.servings',
  'recipes.status',
  'recipes.visibility',
  'recipes.prep_time_minutes',
  'recipes.total_calories_kcal',
  'recipes.total_protein_g',
  'recipes.total_carbs_g',
  'recipes.total_fat_g',
  'recipes.original_recipe_id',
  'recipes.created_at',
] as const;

@Injectable()
export class MeService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async getProfile(userId: string) {
    const user = await this.db
      .selectFrom('users')
      .select([
        'id',
        'email',
        'pseudo',
        'role',
        'avatar_url',
        'bio',
        'phone_number',
        'sex',
        'birth_date',
        'height_cm',
        'weight_kg',
        'accent_color',
        'created_at',
      ])
      .where('id', '=', userId)
      .executeTakeFirstOrThrow();

    const nutritionTarget = await this.db
      .selectFrom('user_nutrition_targets')
      .select(['goal', 'daily_calories_target', 'daily_protein_g_target', 'daily_carbs_g_target', 'daily_fat_g_target'])
      .where('user_id', '=', userId)
      .where('valid_to', 'is', null)
      .executeTakeFirst();

    return { ...user, nutritionTarget: nutritionTarget ?? null };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const userUpdate: Record<string, unknown> = {};
    if (dto.pseudo !== undefined) userUpdate.pseudo = dto.pseudo;
    if (dto.bio !== undefined) userUpdate.bio = dto.bio;
    if (dto.phoneNumber !== undefined) userUpdate.phone_number = dto.phoneNumber;
    if (dto.sex !== undefined) userUpdate.sex = dto.sex;
    if (dto.birthDate !== undefined) userUpdate.birth_date = dto.birthDate;
    if (dto.heightCm !== undefined) userUpdate.height_cm = dto.heightCm;
    if (dto.weightKg !== undefined) userUpdate.weight_kg = dto.weightKg;
    if (dto.accentColor !== undefined) userUpdate.accent_color = dto.accentColor;

    if (Object.keys(userUpdate).length > 0) {
      userUpdate.updated_at = new Date();
      await this.db.updateTable('users').set(userUpdate).where('id', '=', userId).execute();
    }

    if (dto.nutritionGoal) {
      await this.db
        .updateTable('user_nutrition_targets')
        .set({ valid_to: new Date() })
        .where('user_id', '=', userId)
        .where('valid_to', 'is', null)
        .execute();

      await this.db
        .insertInto('user_nutrition_targets')
        .values({
          user_id: userId,
          goal: dto.nutritionGoal,
          daily_calories_target: dto.dailyCaloriesTarget ?? null,
          daily_protein_g_target: dto.dailyProteinGTarget ?? null,
          daily_carbs_g_target: dto.dailyCarbsGTarget ?? null,
          daily_fat_g_target: dto.dailyFatGTarget ?? null,
        })
        .execute();
    }

    return this.getProfile(userId);
  }

  myRecipes(userId: string) {
    return this.db
      .selectFrom('recipes')
      .select(RECIPE_SUMMARY_COLUMNS)
      .where('author_id', '=', userId)
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'desc')
      .execute();
  }

  likedRecipes(userId: string) {
    return this.db
      .selectFrom('recipe_likes')
      .innerJoin('recipes', 'recipes.id', 'recipe_likes.recipe_id')
      .select(RECIPE_SUMMARY_COLUMNS)
      .where('recipe_likes.user_id', '=', userId)
      .where('recipes.deleted_at', 'is', null)
      .orderBy('recipe_likes.created_at', 'desc')
      .execute();
  }

  savedRecipes(userId: string) {
    return this.db
      .selectFrom('recipe_saves')
      .innerJoin('recipes', 'recipes.id', 'recipe_saves.recipe_id')
      .select(RECIPE_SUMMARY_COLUMNS)
      .where('recipe_saves.user_id', '=', userId)
      .where('recipes.deleted_at', 'is', null)
      .orderBy('recipe_saves.created_at', 'desc')
      .execute();
  }

  async collections(userId: string) {
    const rows = await this.db
      .selectFrom('collections')
      .select(({ selectFrom, fn }) => [
        'collections.id',
        'collections.name',
        'collections.created_at',
        selectFrom('collection_recipes')
          .select(fn.countAll().as('count'))
          .whereRef('collection_recipes.collection_id', '=', 'collections.id')
          .as('recipe_count'),
      ])
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();
    return rows.map((r) => ({ ...r, recipe_count: Number(r.recipe_count) }));
  }

  createCollection(userId: string, name: string) {
    return this.db.insertInto('collections').values({ user_id: userId, name }).returningAll().executeTakeFirstOrThrow();
  }

  async collectionRecipes(userId: string, collectionId: string) {
    await this.assertOwnsCollection(userId, collectionId);
    return this.db
      .selectFrom('collection_recipes')
      .innerJoin('recipes', 'recipes.id', 'collection_recipes.recipe_id')
      .select(RECIPE_SUMMARY_COLUMNS)
      .where('collection_recipes.collection_id', '=', collectionId)
      .where('recipes.deleted_at', 'is', null)
      .orderBy('collection_recipes.added_at', 'desc')
      .execute();
  }

  async addRecipeToCollection(userId: string, collectionId: string, recipeId: string) {
    await this.assertOwnsCollection(userId, collectionId);
    await this.db
      .insertInto('collection_recipes')
      .values({ collection_id: collectionId, recipe_id: recipeId })
      .onConflict((oc) => oc.columns(['collection_id', 'recipe_id']).doNothing())
      .execute();
    return { added: true };
  }

  async removeRecipeFromCollection(userId: string, collectionId: string, recipeId: string) {
    await this.assertOwnsCollection(userId, collectionId);
    await this.db
      .deleteFrom('collection_recipes')
      .where('collection_id', '=', collectionId)
      .where('recipe_id', '=', recipeId)
      .execute();
    return { added: false };
  }

  private async assertOwnsCollection(userId: string, collectionId: string) {
    const collection = await this.db
      .selectFrom('collections')
      .select(['user_id'])
      .where('id', '=', collectionId)
      .executeTakeFirst();
    if (!collection) throw new NotFoundException('Collection introuvable.');
    if (collection.user_id !== userId) throw new ForbiddenException("Cette collection ne vous appartient pas.");
  }

  // Nombre de recettes "faites" (recipe_cook_events) regroupées par jour,
  // semaine ou mois, avec les buckets vides comblés à 0 (utilisé par le
  // graphique d'activité de l'espace personnel).
  async activity(userId: string, { granularity = 'day', count = 7 }: ActivityQueryDto) {
    const step = sql<string>`(1 || ' ' || ${granularity})::interval`;
    const rows = await sql<{ bucket_start: Date; count: string }>`
      WITH buckets AS (
        SELECT generate_series(
          date_trunc(${granularity}, now()) - (${count - 1}) * ${step},
          date_trunc(${granularity}, now()),
          ${step}
        ) AS bucket_start
      )
      SELECT b.bucket_start, COUNT(rce.id)::int AS count
      FROM buckets b
      LEFT JOIN recipe_cook_events rce
        ON date_trunc(${granularity}, rce.cooked_at) = b.bucket_start
        AND rce.user_id = ${userId}
      GROUP BY b.bucket_start
      ORDER BY b.bucket_start
    `.execute(this.db);

    return rows.rows.map((r) => ({ date: r.bucket_start, count: Number(r.count) }));
  }

  // "Aujourd'hui" est déterminé côté client (date locale de l'utilisateur,
  // passée en paramètre) plutôt que côté serveur : ça évite tout décalage
  // entre le fuseau du serveur et celui de l'utilisateur pour le "minuit"
  // auquel le compteur du jour doit repartir de zéro.
  async addFoodDiaryEntry(userId: string, dto: CreateFoodDiaryEntryDto) {
    const isRecipe = !!dto.recipeId;
    const isFood = !!dto.foodId;
    if (isRecipe === isFood) {
      throw new BadRequestException('Indiquez soit une recette, soit un aliment (pas les deux).');
    }
    if (isRecipe && !dto.servingsConsumed) {
      throw new BadRequestException('Indiquez le nombre de portions consommées.');
    }
    if (isFood && !dto.quantity) {
      throw new BadRequestException('Indiquez la quantité consommée.');
    }

    return this.db
      .insertInto('food_diary_entries')
      .values({
        user_id: userId,
        entry_date: dto.date,
        meal: dto.meal,
        recipe_id: dto.recipeId ?? null,
        servings_consumed: dto.servingsConsumed ?? null,
        food_id: dto.foodId ?? null,
        quantity: dto.quantity ?? null,
        unit: isFood ? (dto.unit ?? 'gramme') : null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deleteFoodDiaryEntry(userId: string, id: string) {
    const result = await this.db
      .deleteFrom('food_diary_entries')
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .returning('id')
      .executeTakeFirst();
    if (!result) throw new NotFoundException('Entrée introuvable.');
    return { deleted: true };
  }

  // Résout les macros de chaque entrée de journal (recette au prorata des
  // portions consommées, ou aliment via resolveIngredients/aggregate comme
  // pour une recette classique). Partagé entre getFoodDiary (le détail d'un
  // jour) et getNutritionSummary (les totaux agrégés par période).
  private async resolveDiaryEntries(entries: Selectable<FoodDiaryEntriesTable>[]) {
    const recipeIds = [...new Set(entries.filter((e) => e.recipe_id).map((e) => e.recipe_id!))];
    const recipesById = new Map(
      recipeIds.length
        ? (
            await this.db
              .selectFrom('recipes')
              .select(['id', 'title', 'servings', 'total_calories_kcal', 'total_protein_g', 'total_carbs_g', 'total_fat_g'])
              .where('id', 'in', recipeIds)
              .execute()
          ).map((r) => [r.id, r] as const)
        : [],
    );

    const foodEntries = entries.filter((e) => e.food_id);
    const resolvedFoods = foodEntries.length
      ? await resolveIngredients(
          this.db,
          foodEntries.map((e) => ({ foodId: e.food_id!, quantity: e.quantity!, unit: e.unit! })),
        )
      : [];
    const resolvedByEntryId = new Map(foodEntries.map((e, i) => [e.id, resolvedFoods[i]] as const));

    return entries
      .map((e) => {
        if (e.recipe_id) {
          const recipe = recipesById.get(e.recipe_id);
          if (!recipe) return null; // recette supprimée depuis la journalisation
          const factor = (e.servings_consumed ?? 0) / recipe.servings;
          const macros = {
            calories: round(recipe.total_calories_kcal * factor),
            protein: round(recipe.total_protein_g * factor),
            carbs: round(recipe.total_carbs_g * factor),
            fat: round(recipe.total_fat_g * factor),
          };
          return {
            id: e.id,
            entryDate: e.entry_date,
            meal: e.meal,
            label: recipe.title,
            servingsConsumed: e.servings_consumed ?? undefined,
            macros,
          };
        }

        const resolved = resolvedByEntryId.get(e.id);
        if (!resolved) return null;
        const agg = aggregate([resolved]);
        return {
          id: e.id,
          entryDate: e.entry_date,
          meal: e.meal,
          label: resolved.food.name,
          quantity: e.quantity ?? undefined,
          unit: e.unit ?? undefined,
          macros: { calories: agg.calories, protein: agg.protein, carbs: agg.carbs, fat: agg.fat },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  async getFoodDiary(userId: string, date: string) {
    const entries = await this.db
      .selectFrom('food_diary_entries')
      .selectAll()
      .where('user_id', '=', userId)
      .where('entry_date', '=', date)
      .orderBy('created_at', 'asc')
      .execute();

    const items = await this.resolveDiaryEntries(entries);

    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const item of items) {
      totals.calories += item.macros.calories;
      totals.protein += item.macros.protein;
      totals.carbs += item.macros.carbs;
      totals.fat += item.macros.fat;
    }

    return {
      date,
      entries: items.map(({ entryDate, ...rest }) => rest),
      totals: {
        calories: round(totals.calories),
        protein: round(totals.protein),
        carbs: round(totals.carbs),
        fat: round(totals.fat),
      },
    };
  }

  // Récapitulatif des macros consommées, agrégées par jour, semaine ou mois
  // sur les `count` dernières périodes. `today` (date locale du client) sert
  // d'ancre pour construire les périodes, afin de rester cohérent avec le
  // "aujourd'hui" du journal alimentaire (voir getFoodDiary).
  async getNutritionSummary(userId: string, granularity: SummaryGranularity, count: number, today?: string) {
    const todayStr = today ?? new Date().toISOString().slice(0, 10);
    const buckets = buildSummaryBuckets(granularity, count, todayStr);
    const rangeStart = buckets[0].start;

    const entries = await this.db
      .selectFrom('food_diary_entries')
      .selectAll()
      .where('user_id', '=', userId)
      .where('entry_date', '>=', rangeStart)
      .where('entry_date', '<=', todayStr)
      .execute();

    const items = await this.resolveDiaryEntries(entries);

    const sums = new Map(buckets.map((b) => [b.key, { calories: 0, protein: 0, carbs: 0, fat: 0 }]));
    for (const item of items) {
      const key = bucketKeyFor(item.entryDate, granularity);
      const sum = sums.get(key);
      if (!sum) continue; // hors de la fenêtre demandée (ne devrait pas arriver vu le filtre SQL)
      sum.calories += item.macros.calories;
      sum.protein += item.macros.protein;
      sum.carbs += item.macros.carbs;
      sum.fat += item.macros.fat;
    }

    return buckets.map((b) => {
      const sum = sums.get(b.key)!;
      return {
        date: b.start,
        calories: round(sum.calories),
        protein: round(sum.protein),
        carbs: round(sum.carbs),
        fat: round(sum.fat),
      };
    });
  }
}

type SummaryGranularity = 'day' | 'week' | 'month';

function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = dimanche .. 6 = samedi
  const diff = (day === 0 ? -6 : 1) - day;
  return addDaysToDateStr(dateStr, diff);
}

function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7); // AAAA-MM
}

function bucketKeyFor(dateStr: string, granularity: SummaryGranularity): string {
  if (granularity === 'day') return dateStr;
  if (granularity === 'week') return mondayOf(dateStr);
  return monthKeyOf(dateStr);
}

function buildSummaryBuckets(
  granularity: SummaryGranularity,
  count: number,
  todayStr: string,
): { key: string; start: string }[] {
  if (granularity === 'day') {
    return Array.from({ length: count }, (_, i) => {
      const start = addDaysToDateStr(todayStr, -(count - 1 - i));
      return { key: start, start };
    });
  }
  if (granularity === 'week') {
    const thisMonday = mondayOf(todayStr);
    return Array.from({ length: count }, (_, i) => {
      const start = addDaysToDateStr(thisMonday, -(count - 1 - i) * 7);
      return { key: start, start };
    });
  }
  const [year, month] = todayStr.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    const d = new Date(Date.UTC(year, month - 1 - offset, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    return { key, start: `${key}-01` };
  });
}
