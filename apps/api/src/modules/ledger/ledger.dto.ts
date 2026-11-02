import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { CleanText } from '../../common/clean-text';
import { NormalizePhone } from '../patients/patients.dto';
import { CATEGORIES, type Category } from './categories';

/** A Gregorian calendar day, `yyyy-MM-dd`; the web app converts from Jalali. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Ten quadrillion rials — far beyond any real bill, well inside 2^53. */
const MAX_AMOUNT = 10_000_000_000_000_000;

export class PaymentDto {
  @Matches(ISO_DAY)
  date: string;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amount: number;

  /** Who paid, when it was not the patient. */
  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(120)
  payerName?: string | null;

  /** Where the money came from — the payer's bank or card. */
  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(120)
  source?: string | null;

  /** Where it went — one of the practice's accounts. */
  @IsOptional()
  @IsUUID()
  accountId?: string | null;

  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(300)
  note?: string | null;
}

export class UpdatePaymentDto {
  @IsOptional()
  @Matches(ISO_DAY)
  date?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT)
  amount?: number;

  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(120)
  payerName?: string | null;

  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(120)
  source?: string | null;

  @IsOptional()
  @IsUUID()
  accountId?: string | null;

  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(300)
  note?: string | null;
}

export class EntryDto {
  /** An existing patient … */
  @IsOptional()
  @IsUUID()
  patientId?: string;

  /** … or a new one, created with the entry. */
  @IsOptional()
  @CleanText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  patientName?: string;

  @IsOptional()
  @NormalizePhone()
  @IsString()
  @MaxLength(32)
  patientPhone?: string | null;

  @Matches(ISO_DAY)
  date: string;

  @IsIn(CATEGORIES)
  category: Category;

  @IsOptional()
  @IsUUID()
  doctorId?: string | null;

  /** The cost in rials. Ignored (stored as 0) for a deposit. */
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  amount: number;

  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(300)
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments?: PaymentDto[];

  /** Put the patient's deposits toward what is left on the entry. */
  @IsOptional()
  @IsBoolean()
  applyDeposits?: boolean;
}

export class UpdateEntryDto {
  @IsOptional()
  @Matches(ISO_DAY)
  date?: string;

  @IsOptional()
  @IsIn(CATEGORIES)
  category?: Category;

  @IsOptional()
  @IsUUID()
  doctorId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT)
  amount?: number;

  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(300)
  description?: string | null;
}
