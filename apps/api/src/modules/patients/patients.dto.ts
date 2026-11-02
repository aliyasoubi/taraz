import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { CleanText } from '../../common/clean-text';
import { normalizePhone } from '../../common/persian-text';

export const NormalizePhone = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  );

export class PatientDto {
  @CleanText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @NormalizePhone()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}

export class UpdatePatientDto {
  @IsOptional()
  @CleanText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @NormalizePhone()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}

export const PATIENT_STATUSES = [
  'all',
  'debtor',
  'creditor',
  'settled',
] as const;
export type PatientStatus = (typeof PATIENT_STATUSES)[number];

export const PATIENT_SORTS = ['recent', 'name', 'balance'] as const;
export type PatientSort = (typeof PATIENT_SORTS)[number];

export class PatientQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsIn(PATIENT_STATUSES)
  status?: PatientStatus;

  @IsOptional()
  @IsIn(PATIENT_SORTS)
  sort?: PatientSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
