import { MacroSet } from '../api/types';

export interface LiveIngredient {
  foodId: string;
  name: string;
  grams: number;
  per100g: MacroSet;
  replacedFoodId?: string | null;
}

const round = (n: number) => Math.round(n * 100) / 100;

// Recalcul purement client, en miroir de backend/src/recipes/macro-calculator.ts,
// pour un retour instantané pendant l'édition (fenêtre d'adaptation, création
// de recette) sans round-trip serveur à chaque changement de quantité. Le
// serveur reste la source de vérité : il recalcule à l'identique à la
// sauvegarde à partir des données les plus fraîches en base.
export function computeTotals(ingredients: LiveIngredient[]): MacroSet & { totalGrams: number } {
  let totalGrams = 0;
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;
  let sugar = 0;
  let saturatedFat = 0;
  let salt = 0;
  let hasFiber = false;
  let hasSugar = false;
  let hasSaturatedFat = false;
  let hasSalt = false;

  for (const { grams, per100g } of ingredients) {
    const factor = grams / 100;
    totalGrams += grams;
    calories += per100g.calories * factor;
    protein += per100g.protein * factor;
    carbs += per100g.carbs * factor;
    fat += per100g.fat * factor;
    if (per100g.fiber != null) {
      fiber += per100g.fiber * factor;
      hasFiber = true;
    }
    if (per100g.sugar != null) {
      sugar += per100g.sugar * factor;
      hasSugar = true;
    }
    if (per100g.saturatedFat != null) {
      saturatedFat += per100g.saturatedFat * factor;
      hasSaturatedFat = true;
    }
    if (per100g.salt != null) {
      salt += per100g.salt * factor;
      hasSalt = true;
    }
  }

  return {
    totalGrams: round(totalGrams),
    calories: round(calories),
    protein: round(protein),
    carbs: round(carbs),
    fat: round(fat),
    fiber: hasFiber ? round(fiber) : null,
    sugar: hasSugar ? round(sugar) : null,
    saturatedFat: hasSaturatedFat ? round(saturatedFat) : null,
    salt: hasSalt ? round(salt) : null,
  };
}

export function perServing(totals: MacroSet, servings: number): MacroSet {
  const div = (n: number | null) => (n == null ? null : round(n / Math.max(servings, 1)));
  return {
    calories: div(totals.calories)!,
    protein: div(totals.protein)!,
    carbs: div(totals.carbs)!,
    fat: div(totals.fat)!,
    fiber: div(totals.fiber),
    sugar: div(totals.sugar),
    saturatedFat: div(totals.saturatedFat),
    salt: div(totals.salt),
  };
}
