import { IsIn, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export const MEASUREMENT_UNITS = [
  'gramme',
  'millilitre',
  'cuillere_a_soupe',
  'cuillere_a_cafe',
  'portion',
  'unite',
  'tranche',
  'verre',
  'tasse',
] as const;

export class RecipeIngredientInputDto {
  @IsString()
  @MinLength(1)
  foodId!: string;

  @IsPositive()
  quantity!: number;

  @IsIn(MEASUREMENT_UNITS)
  @IsOptional()
  unit?: (typeof MEASUREMENT_UNITS)[number] = 'gramme';

  @IsString()
  @IsOptional()
  note?: string;

  // Renseigné quand cette ligne remplace un autre aliment (§5.6 du brief),
  // pour permettre l'affichage du comparatif nutritionnel avant/après.
  @IsString()
  @IsOptional()
  replacedFoodId?: string;
}
