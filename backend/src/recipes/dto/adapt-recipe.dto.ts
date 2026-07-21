import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';
import { RecipeIngredientInputDto } from './recipe-ingredient-input.dto';

export class AdaptRecipeDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  servings?: number;

  // Liste complète des ingrédients souhaités pour la version adaptée (la
  // fenêtre d'adaptation du brief §5.4 pré-remplit les quantités d'origine
  // côté client, qui renvoie ici la liste après modification).
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientInputDto)
  ingredients!: RecipeIngredientInputDto[];

  @IsIn(['publique', 'privee'])
  @IsOptional()
  visibility?: 'publique' | 'privee' = 'privee';
}
