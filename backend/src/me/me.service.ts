import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY } from '../db/database.module';
import { Database } from '../db/types';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
}
