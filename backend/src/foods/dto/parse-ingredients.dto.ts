import { IsString, MinLength } from 'class-validator';

export class ParseIngredientsDto {
  @IsString()
  @MinLength(1)
  text!: string;
}
