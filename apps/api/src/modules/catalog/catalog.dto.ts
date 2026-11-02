import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { CleanText } from '../../common/clean-text';
import { ACCOUNT_KINDS, type AccountKind } from './account.entity';

export class DoctorDto {
  @CleanText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateDoctorDto {
  @IsOptional()
  @CleanText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class AccountDto {
  @CleanText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string;

  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(80)
  holder?: string | null;

  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(40)
  bank?: string | null;

  @IsOptional()
  @IsIn(ACCOUNT_KINDS)
  kind?: AccountKind;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateAccountDto {
  @IsOptional()
  @CleanText()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(80)
  holder?: string | null;

  @IsOptional()
  @CleanText()
  @IsString()
  @MaxLength(40)
  bank?: string | null;

  @IsOptional()
  @IsIn(ACCOUNT_KINDS)
  kind?: AccountKind;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
