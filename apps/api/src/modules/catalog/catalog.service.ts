import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { ConflictError, NotFoundError } from '../../common/errors';
import { Account } from './account.entity';
import {
  AccountDto,
  DoctorDto,
  UpdateAccountDto,
  UpdateDoctorDto,
} from './catalog.dto';
import { Doctor } from './doctor.entity';

const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err.driverError as { code?: string }).code === UNIQUE_VIOLATION
  );
}

/** The two short lists every entry picks from: doctors and destination accounts. */
@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Doctor) private readonly doctors: Repository<Doctor>,
    @InjectRepository(Account) private readonly accounts: Repository<Account>,
  ) {}

  listDoctors(): Promise<Doctor[]> {
    return this.doctors.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async createDoctor(dto: DoctorDto): Promise<Doctor> {
    try {
      return await this.doctors.save(this.doctors.create(dto));
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError('doctor_name_taken');
      throw err;
    }
  }

  async updateDoctor(id: string, dto: UpdateDoctorDto): Promise<Doctor> {
    const doctor = await this.doctors.findOneBy({ id });
    if (!doctor) throw new NotFoundError('doctor_not_found');
    try {
      return await this.doctors.save(Object.assign(doctor, dto));
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError('doctor_name_taken');
      throw err;
    }
  }

  listAccounts(): Promise<Account[]> {
    return this.accounts.find({ order: { sortOrder: 'ASC', title: 'ASC' } });
  }

  async createAccount(dto: AccountDto): Promise<Account> {
    try {
      return await this.accounts.save(this.accounts.create(dto));
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictError('account_title_taken');
      throw err;
    }
  }

  async updateAccount(id: string, dto: UpdateAccountDto): Promise<Account> {
    const account = await this.accounts.findOneBy({ id });
    if (!account) throw new NotFoundError('account_not_found');
    try {
      return await this.accounts.save(Object.assign(account, dto));
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictError('account_title_taken');
      throw err;
    }
  }
}
