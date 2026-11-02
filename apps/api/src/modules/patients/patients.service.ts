import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { NotFoundError } from '../../common/errors';
import { searchKey, toLatinDigits } from '../../common/persian-text';
import { Patient } from './patient.entity';
import { PatientDto, PatientQueryDto, UpdatePatientDto } from './patients.dto';

export interface PatientSummary {
  id: string;
  name: string;
  phone: string | null;
  charged: number;
  paid: number;
  /** Positive: the patient owes. Negative: in credit (a deposit). */
  balance: number;
  /** Paid as deposits and not yet applied to a treatment. */
  deposits: number;
  lastActivity: string | null;
}

export interface PatientPage {
  items: PatientSummary[];
  total: number;
  page: number;
  limit: number;
}

interface SummaryRow {
  id: string;
  name: string;
  phone: string | null;
  charged: string;
  paid: string;
  balance: string;
  deposits: string;
  last_activity: string | null;
  total: string;
}

/**
 * Per-patient totals. The single SQL definition of a balance — costs less
 * payments over every entry the patient has — that lists and look-ups share.
 */
export const BALANCES_CTE = `
  charges AS (
    SELECT patient_id, SUM(amount) AS charged, MAX(date) AS last_date
    FROM entries GROUP BY patient_id
  ),
  receipts AS (
    SELECT e.patient_id, SUM(p.amount) AS paid, MAX(p.date) AS last_date
    FROM payments p JOIN entries e ON e.id = p.entry_id
    GROUP BY e.patient_id
  ),
  held AS (
    SELECT e.patient_id, SUM(p.amount) AS deposits
    FROM payments p JOIN entries e ON e.id = p.entry_id
    WHERE e.category = 'deposit'
    GROUP BY e.patient_id
  ),
  balances AS (
    SELECT p.id, p.name, p.name_key, p.phone, p.created_at,
      COALESCE(c.charged, 0) AS charged,
      COALESCE(r.paid, 0) AS paid,
      COALESCE(c.charged, 0) - COALESCE(r.paid, 0) AS balance,
      COALESCE(h.deposits, 0) AS deposits,
      GREATEST(c.last_date, r.last_date) AS last_activity
    FROM patients p
    LEFT JOIN charges c ON c.patient_id = p.id
    LEFT JOIN receipts r ON r.patient_id = p.id
    LEFT JOIN held h ON h.patient_id = p.id
  )`;

const ORDER: Record<NonNullable<PatientQueryDto['sort']>, string> = {
  recent: 'last_activity DESC NULLS LAST, created_at DESC',
  name: 'name ASC',
  balance: 'balance DESC, name ASC',
};

const STATUS: Record<NonNullable<PatientQueryDto['status']>, string> = {
  all: 'TRUE',
  debtor: 'balance > 0',
  creditor: 'balance < 0',
  settled: 'balance = 0',
};

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async list(query: PatientQueryDto): Promise<PatientPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const key = searchKey(query.q);
    const digits = toLatinDigits(query.q ?? '').replace(/\D/g, '');
    const rows: SummaryRow[] = await this.db.query(
      `WITH ${BALANCES_CTE}
       SELECT id, name, phone, charged, paid, balance, deposits, last_activity,
              COUNT(*) OVER () AS total
       FROM balances
       WHERE ${STATUS[query.status ?? 'all']}
         AND ($1 = '' OR name_key LIKE '%' || $1 || '%' OR ($2 <> '' AND phone LIKE '%' || $2 || '%'))
       ORDER BY ${ORDER[query.sort ?? 'recent']}
       LIMIT $3 OFFSET $4`,
      [key, digits, limit, (page - 1) * limit],
    );
    return {
      items: rows.map(toSummary),
      total: rows.length ? Number(rows[0].total) : 0,
      page,
      limit,
    };
  }

  async summary(id: string): Promise<PatientSummary> {
    const rows: SummaryRow[] = await this.db.query(
      `WITH ${BALANCES_CTE}
       SELECT id, name, phone, charged, paid, balance, deposits, last_activity, 1 AS total
       FROM balances WHERE id = $1`,
      [id],
    );
    if (!rows.length) throw new NotFoundError('patient_not_found');
    return toSummary(rows[0]);
  }

  async get(id: string): Promise<Patient> {
    const patient = await this.patients.findOneBy({ id });
    if (!patient) throw new NotFoundError('patient_not_found');
    return patient;
  }

  create(dto: PatientDto): Promise<Patient> {
    return this.patients.save(
      this.patients.create({
        name: dto.name,
        phone: dto.phone ?? null,
        note: dto.note ?? null,
      }),
    );
  }

  async update(id: string, dto: UpdatePatientDto): Promise<Patient> {
    const patient = await this.get(id);
    if (dto.name !== undefined) patient.name = dto.name;
    if (dto.phone !== undefined) patient.phone = dto.phone;
    if (dto.note !== undefined) patient.note = dto.note;
    return this.patients.save(patient);
  }

  /** Removes the patient with every entry and payment on their account. */
  async remove(id: string): Promise<void> {
    const result = await this.patients.delete({ id });
    if (!result.affected) throw new NotFoundError('patient_not_found');
  }
}

function toSummary(row: SummaryRow): PatientSummary {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    charged: Number(row.charged),
    paid: Number(row.paid),
    balance: Number(row.balance),
    deposits: Number(row.deposits),
    lastActivity: row.last_activity,
  };
}
