import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class NutritionSummaryQueryDto {
  @IsIn(['day', 'week', 'month'])
  @IsOptional()
  granularity?: 'day' | 'week' | 'month' = 'day';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  count?: number = 7;

  // Date locale du client (voir todayLocalISO côté frontend), pour ancrer
  // les périodes sur le "aujourd'hui" de l'utilisateur plutôt que celui,
  // potentiellement décalé, du serveur.
  @Matches(DATE_ONLY, { message: 'today doit être au format AAAA-MM-JJ.' })
  @IsOptional()
  today?: string;
}
