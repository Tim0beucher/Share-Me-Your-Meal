import { IsIn, IsNumber, IsOptional, IsPositive, IsUUID, Matches } from 'class-validator';
import { MEASUREMENT_UNITS } from '../../recipes/dto/recipe-ingredient-input.dto';

export const MEAL_CATEGORIES = [
  'petit_dejeuner',
  'dejeuner',
  'diner',
  'collation',
  'dessert',
  'post_entrainement',
] as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateFoodDiaryEntryDto {
  @Matches(DATE_ONLY, { message: 'date doit être au format AAAA-MM-JJ.' })
  date!: string;

  @IsIn(MEAL_CATEGORIES)
  meal!: (typeof MEAL_CATEGORIES)[number];

  // Renseigner soit recipeId + servingsConsumed, soit foodId + quantity (pas les deux).
  @IsUUID()
  @IsOptional()
  recipeId?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  servingsConsumed?: number;

  @IsUUID()
  @IsOptional()
  foodId?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  @IsIn(MEASUREMENT_UNITS)
  @IsOptional()
  unit?: (typeof MEASUREMENT_UNITS)[number];
}

export class FoodDiaryQueryDto {
  @Matches(DATE_ONLY, { message: 'date doit être au format AAAA-MM-JJ.' })
  date!: string;
}
