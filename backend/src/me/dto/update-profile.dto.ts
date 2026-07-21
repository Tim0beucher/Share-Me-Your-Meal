import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive, IsString, Matches, MinLength } from 'class-validator';

const SEXES = ['femme', 'homme', 'autre'] as const;
const NUTRITION_GOALS = [
  'perte_de_poids',
  'maintien_du_poids',
  'prise_de_masse',
  'alimentation_equilibree',
  'performance_sportive',
] as const;

export class UpdateProfileDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  pseudo?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsIn(SEXES)
  @IsOptional()
  sex?: (typeof SEXES)[number];

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  heightCm?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  weightKg?: number;

  // Format strict aligné sur la contrainte CHECK de la colonne accent_color
  // (#rrggbb, 6 chiffres hex) : c'est exactement ce qu'émet <input type="color">.
  @Matches(/^#[0-9a-fA-F]{6}$/)
  @IsOptional()
  accentColor?: string;

  // Renseigner nutritionGoal déclenche la création d'une nouvelle ligne
  // d'objectif (historisée) ; les cibles journalières sont optionnelles.
  @IsIn(NUTRITION_GOALS)
  @IsOptional()
  nutritionGoal?: (typeof NUTRITION_GOALS)[number];

  @IsNumber()
  @IsPositive()
  @IsOptional()
  dailyCaloriesTarget?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  dailyProteinGTarget?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  dailyCarbsGTarget?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  dailyFatGTarget?: number;
}
