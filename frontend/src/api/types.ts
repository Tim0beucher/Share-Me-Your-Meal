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

export type UserRole = 'user' | 'creator' | 'coach' | 'admin';

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; pseudo: string; role: UserRole };
}

export interface FoodSearchResult {
  id: string;
  name: string;
  brand: string | null;
  state: string;
  calories_kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
}

export interface MacroSet {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  saturatedFat: number | null;
  salt: number | null;
}

export interface RecipeIngredient {
  foodId: string;
  name: string;
  state: string;
  quantity: number;
  unit: MeasurementUnit;
  grams: number;
  note: string | null;
  replacedFoodId: string | null;
  per100g: MacroSet;
}

export interface RecipeDetail {
  id: string;
  authorId: string;
  title: string;
  description: string | null;
  servings: number;
  status: string;
  visibility: string;
  originalRecipeId: string | null;
  adaptationType: string | null;
  coverPhotoUrl: string | null;
  ingredients: RecipeIngredient[];
  steps?: { step_number: number; instruction: string; photo_url: string | null }[];
  adaptedCount?: number;
  macros: {
    total: MacroSet;
    perServing: Omit<MacroSet, never>;
    per100g: Omit<MacroSet, never>;
  };
}

export interface FeedItem {
  id: string;
  title: string;
  coverPhotoUrl: string | null;
  servings: number;
  prepTimeMinutes: number | null;
  author: string;
  isAdaptation: boolean;
  likeCount: number;
  saveCount: number;
  macros: { calories: number; protein: number; carbs: number; fat: number };
}

export interface RecipeSummary {
  id: string;
  title: string;
  cover_photo_url: string | null;
  servings: number;
  status: string;
  visibility: string;
  prep_time_minutes: number | null;
  total_calories_kcal: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  original_recipe_id: string | null;
  created_at: string;
}

export interface NutritionTarget {
  goal: string;
  daily_calories_target: number | null;
  daily_protein_g_target: number | null;
  daily_carbs_g_target: number | null;
  daily_fat_g_target: number | null;
}

export interface UserProfile {
  id: string;
  email: string;
  pseudo: string;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  phone_number: string | null;
  sex: string | null;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  accent_color: string | null;
  created_at: string;
  nutritionTarget: NutritionTarget | null;
}

export interface FoodDiaryItem {
  id: string;
  meal: string;
  label: string;
  servingsConsumed?: number;
  quantity?: number;
  unit?: MeasurementUnit;
  macros: { calories: number; protein: number; carbs: number; fat: number };
}

export interface FoodDiaryResponse {
  date: string;
  entries: FoodDiaryItem[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

export interface NutritionSummaryBucket {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Collection {
  id: string;
  name: string;
  created_at: string;
  recipe_count: number;
}

export interface Comment {
  id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  user_id: string;
  author_pseudo: string;
}

export interface ActivityBucket {
  date: string;
  count: number;
}

export interface AdminStats {
  users: number;
  recipes: number;
  comments: number;
  pendingReports: number;
}

export interface AdminReport {
  id: string;
  target_type: 'recette' | 'commentaire' | 'aliment' | 'utilisateur';
  target_id: string;
  reason: string;
  status: 'en_attente' | 'traite' | 'rejete';
  resolution_note: string | null;
  created_at: string;
  reporter_pseudo: string;
  targetPreview: string | null;
}

export interface AdminUser {
  id: string;
  pseudo: string;
  email: string;
  role: UserRole;
  created_at: string;
  deleted_at: string | null;
}
