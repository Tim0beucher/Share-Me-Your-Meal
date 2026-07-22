import { FoodSearchResult, MacroSet } from '../api/types';

export interface DraftIngredient {
  foodId: string;
  name: string;
  state: string;
  grams: number;
  per100g: MacroSet;
  // Suggestions alternatives proposées par l'analyse de texte libre, pour
  // corriger en un clic un aliment mal reconnu (voir IngredientTextParser).
  alternatives?: FoodSearchResult[];
  // Quantité non précisée dans le texte libre, remplacée par une valeur par
  // défaut (100 g) à faire vérifier par l'utilisateur.
  quantityGuessed?: boolean;
}

export function toPer100g(food: FoodSearchResult): MacroSet {
  return {
    calories: food.calories_kcal_per_100g,
    protein: food.protein_g_per_100g,
    carbs: food.carbs_g_per_100g,
    fat: food.fat_g_per_100g,
    fiber: null,
    sugar: null,
    saturatedFat: null,
    salt: null,
  };
}
