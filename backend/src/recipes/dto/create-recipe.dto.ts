import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RecipeIngredientInputDto } from './recipe-ingredient-input.dto';

export class RecipeStepInputDto {
  @IsInt()
  @Min(1)
  stepNumber!: number;

  @IsString()
  @MinLength(1)
  instruction!: string;
}

export class CreateRecipeDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  servings?: number = 1;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientInputDto)
  ingredients!: RecipeIngredientInputDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RecipeStepInputDto)
  steps?: RecipeStepInputDto[];

  @IsBoolean()
  @IsOptional()
  publish?: boolean = false;
}
