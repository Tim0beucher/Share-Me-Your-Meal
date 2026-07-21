import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const TARGET_TYPES = ['recette', 'commentaire', 'aliment', 'utilisateur'] as const;

export class CreateReportDto {
  @IsIn(TARGET_TYPES)
  targetType!: (typeof TARGET_TYPES)[number];

  @IsUUID()
  targetId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
