import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database, FoodState, MeasurementUnit } from '../db/types';

export interface IngredientInput {
  foodId: string;
  quantity: number;
  unit?: MeasurementUnit;
  note?: string;
  replacedFoodId?: string;
}

interface FoodNutrition {
  id: string;
  name: string;
  state: FoodState;
  calories_kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g: number | null;
  sugar_g_per_100g: number | null;
  saturated_fat_g_per_100g: number | null;
  salt_g_per_100g: number | null;
}

export interface ResolvedIngredient {
  foodId: string;
  quantity: number;
  unit: MeasurementUnit;
  note?: string;
  replacedFoodId?: string;
  grams: number;
  food: FoodNutrition;
}

export interface MacroTotals {
  totalGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  saturatedFat: number | null;
  salt: number | null;
}

const NUTRITION_COLUMNS = [
  'id',
  'name',
  'state',
  'calories_kcal_per_100g',
  'protein_g_per_100g',
  'carbs_g_per_100g',
  'fat_g_per_100g',
  'fiber_g_per_100g',
  'sugar_g_per_100g',
  'saturated_fat_g_per_100g',
  'salt_g_per_100g',
] as const;

async function gramsFor(
  db: Kysely<Database>,
  foodId: string,
  quantity: number,
  unit: MeasurementUnit,
): Promise<number> {
  if (unit === 'gramme') return quantity;

  const specific = await db
    .selectFrom('food_unit_equivalences')
    .select('grams_equivalent')
    .where('food_id', '=', foodId)
    .where('unit', '=', unit)
    .executeTakeFirst();
  if (specific) return quantity * specific.grams_equivalent;

  const generic = await db
    .selectFrom('food_unit_equivalences')
    .select('grams_equivalent')
    .where('food_id', 'is', null)
    .where('unit', '=', unit)
    .executeTakeFirst();
  if (generic) return quantity * generic.grams_equivalent;

  throw new BadRequestException(
    `Aucune équivalence connue pour convertir l'unité "${unit}" en grammes pour cet aliment ; indiquez la quantité en grammes.`,
  );
}

export async function resolveIngredients(
  db: Kysely<Database>,
  items: IngredientInput[],
): Promise<ResolvedIngredient[]> {
  const foodIds = [...new Set(items.map((i) => i.foodId))];
  const foods = await db.selectFrom('foods').select(NUTRITION_COLUMNS).where('id', 'in', foodIds).execute();
  const foodMap = new Map(foods.map((f) => [f.id, f]));

  const resolved: ResolvedIngredient[] = [];
  for (const item of items) {
    const food = foodMap.get(item.foodId);
    if (!food) {
      throw new NotFoundException(`Aliment introuvable : ${item.foodId}`);
    }
    const unit = item.unit ?? 'gramme';
    const grams = await gramsFor(db, item.foodId, item.quantity, unit);
    resolved.push({ ...item, unit, grams, food });
  }
  return resolved;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function aggregate(resolved: ResolvedIngredient[]): MacroTotals {
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

  for (const { grams, food } of resolved) {
    const factor = grams / 100;
    totalGrams += grams;
    calories += food.calories_kcal_per_100g * factor;
    protein += food.protein_g_per_100g * factor;
    carbs += food.carbs_g_per_100g * factor;
    fat += food.fat_g_per_100g * factor;
    if (food.fiber_g_per_100g != null) {
      fiber += food.fiber_g_per_100g * factor;
      hasFiber = true;
    }
    if (food.sugar_g_per_100g != null) {
      sugar += food.sugar_g_per_100g * factor;
      hasSugar = true;
    }
    if (food.saturated_fat_g_per_100g != null) {
      saturatedFat += food.saturated_fat_g_per_100g * factor;
      hasSaturatedFat = true;
    }
    if (food.salt_g_per_100g != null) {
      salt += food.salt_g_per_100g * factor;
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

export function perServing(totals: MacroTotals, servings: number): Omit<MacroTotals, 'totalGrams'> {
  const div = (n: number | null) => (n == null ? null : round(n / servings));
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

export function per100g(totals: MacroTotals): Omit<MacroTotals, 'totalGrams'> {
  const factor = totals.totalGrams > 0 ? 100 / totals.totalGrams : 0;
  const scale = (n: number | null) => (n == null ? null : round(n * factor));
  return {
    calories: scale(totals.calories)!,
    protein: scale(totals.protein)!,
    carbs: scale(totals.carbs)!,
    fat: scale(totals.fat)!,
    fiber: scale(totals.fiber),
    sugar: scale(totals.sugar),
    saturatedFat: scale(totals.saturatedFat),
    salt: scale(totals.salt),
  };
}
