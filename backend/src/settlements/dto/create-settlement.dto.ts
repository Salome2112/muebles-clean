import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSettlementDto {
  @IsUUID()
  quoteId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
