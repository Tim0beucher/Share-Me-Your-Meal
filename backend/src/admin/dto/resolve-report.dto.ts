import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveReportDto {
  @IsIn(['traite', 'rejete'])
  status!: 'traite' | 'rejete';

  @IsString()
  @MaxLength(500)
  @IsOptional()
  resolutionNote?: string;
}
