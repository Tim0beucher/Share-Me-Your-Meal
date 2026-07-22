import { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type AuthProvider = 'email' | 'google' | 'apple' | 'facebook';
export type UserRole = 'user' | 'creator' | 'coach' | 'admin';
export type UserSex = 'femme' | 'homme' | 'autre';
export type NutritionGoal =
  | 'perte_de_poids'
  | 'maintien_du_poids'
  | 'prise_de_masse'
  | 'alimentation_equilibree'
  | 'performance_sportive';
export type FoodState = 'cru' | 'cuit' | 'generique' | 'produit_de_marque';
export type FoodVerificationStatus = 'non_verifie' | 'verifie' | 'signale';
export type RecipeStatus = 'brouillon' | 'publiee' | 'masquee' | 'supprimee';
export type RecipeVisibility = 'publique' | 'privee';
export type AdaptationType = 'grammage' | 'portions' | 'substitution_ingredient' | 'duplication_libre';
export type MeasurementUnit =
  | 'gramme'
  | 'millilitre'
  | 'cuillere_a_soupe'
  | 'cuillere_a_cafe'
  | 'portion'
  | 'unite'
  | 'tranche'
  | 'verre'
  | 'tasse';

export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string | null;
  auth_provider: AuthProvider;
  pseudo: string;
  avatar_url: string | null;
  bio: string | null;
  role: Generated<UserRole>;
  is_verified_creator: Generated<boolean>;
  phone_number: string | null;
  sex: UserSex | null;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  accent_color: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  deleted_at: Timestamp | null;
}

export interface UserNutritionTargetsTable {
  id: Generated<string>;
  user_id: string;
  goal: NutritionGoal;
  daily_calories_target: number | null;
  daily_protein_g_target: number | null;
  daily_carbs_g_target: number | null;
  daily_fat_g_target: number | null;
  valid_from: Generated<Timestamp>;
  valid_to: Timestamp | null;
}

export interface FoodsTable {
  id: Generated<string>;
  name: string;
  brand: string | null;
  state: Generated<FoodState>;
  category_id: number | null;
  calories_kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g: number | null;
  sugar_g_per_100g: number | null;
  saturated_fat_g_per_100g: number | null;
  salt_g_per_100g: number | null;
  sodium_mg_per_100g: number | null;
  barcode: string | null;
  label_photo_url: string | null;
  verification_status: Generated<FoodVerificationStatus>;
  verified_by: string | null;
  verified_at: Timestamp | null;
  created_by: string | null;
  source: string | null;
  source_ref: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface RecipesTable {
  id: Generated<string>;
  author_id: string;
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  category_id: number | null;
  meal_category: string | null;
  difficulty: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: Generated<number>;
  tips_and_variants: string | null;
  status: Generated<RecipeStatus>;
  visibility: Generated<RecipeVisibility>;
  original_recipe_id: string | null;
  adaptation_type: AdaptationType | null;
  total_calories_kcal: Generated<number>;
  total_protein_g: Generated<number>;
  total_carbs_g: Generated<number>;
  total_fat_g: Generated<number>;
  total_fiber_g: number | null;
  total_sugar_g: number | null;
  total_saturated_fat_g: number | null;
  total_salt_g: number | null;
  published_at: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  deleted_at: Timestamp | null;
}

export interface RecipeIngredientsTable {
  id: Generated<string>;
  recipe_id: string;
  food_id: string;
  quantity: number;
  unit: Generated<MeasurementUnit>;
  sort_order: Generated<number>;
  note: string | null;
  replaced_food_id: string | null;
}

export interface RecipeStepsTable {
  id: Generated<string>;
  recipe_id: string;
  step_number: number;
  instruction: string;
  photo_url: string | null;
}

export interface RecipeLikesTable {
  user_id: string;
  recipe_id: string;
  created_at: Generated<Timestamp>;
}

export interface RecipeSavesTable {
  user_id: string;
  recipe_id: string;
  created_at: Generated<Timestamp>;
}

export type ReportTargetType = 'recette' | 'commentaire' | 'aliment' | 'utilisateur';
export type ReportStatus = 'en_attente' | 'traite' | 'rejete';

export interface ReportsTable {
  id: Generated<string>;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: Generated<ReportStatus>;
  resolved_by: string | null;
  resolved_at: Timestamp | null;
  resolution_note: string | null;
  created_at: Generated<Timestamp>;
}

export interface CommentsTable {
  id: Generated<string>;
  recipe_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  is_hidden: Generated<boolean>;
  created_at: Generated<Timestamp>;
  deleted_at: Timestamp | null;
}

export interface PasswordResetTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Timestamp;
  used_at: Timestamp | null;
  created_at: Generated<Timestamp>;
}

export interface FoodUnitEquivalencesTable {
  id: Generated<string>;
  food_id: string | null;
  unit: MeasurementUnit;
  grams_equivalent: number;
  is_approximate: Generated<boolean>;
}

export interface CollectionsTable {
  id: Generated<string>;
  user_id: string;
  name: string;
  created_at: Generated<Timestamp>;
}

export interface CollectionRecipesTable {
  collection_id: string;
  recipe_id: string;
  added_at: Generated<Timestamp>;
}

export interface RecipeCookEventsTable {
  id: Generated<string>;
  user_id: string;
  recipe_id: string;
  cooked_at: Generated<Timestamp>;
}

export interface Database {
  users: UsersTable;
  user_nutrition_targets: UserNutritionTargetsTable;
  foods: FoodsTable;
  recipes: RecipesTable;
  recipe_ingredients: RecipeIngredientsTable;
  recipe_steps: RecipeStepsTable;
  recipe_likes: RecipeLikesTable;
  recipe_saves: RecipeSavesTable;
  food_unit_equivalences: FoodUnitEquivalencesTable;
  collections: CollectionsTable;
  collection_recipes: CollectionRecipesTable;
  recipe_cook_events: RecipeCookEventsTable;
  comments: CommentsTable;
  reports: ReportsTable;
  password_reset_tokens: PasswordResetTokensTable;
}
