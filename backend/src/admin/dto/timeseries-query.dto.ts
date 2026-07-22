import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class TimeseriesQueryDto {
  @IsIn(['users', 'recipes', 'comments', 'reports'])
  metric!: 'users' | 'recipes' | 'comments' | 'reports';

  @IsIn(['day', 'week', 'month'])
  @IsOptional()
  granularity?: 'day' | 'week' | 'month' = 'day';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  count?: number = 14;
}
