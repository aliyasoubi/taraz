import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';

import { InvalidInputError, NotFoundError } from '../../common/errors';
import { Account } from '../catalog/account.entity';
import { Doctor } from '../catalog/doctor.entity';
import { Patient } from '../patients/patient.entity';
import { planDeposits, takesDeposits } from './deposits';
import { Entry } from './entry.entity';
import {
  EntryDto,
  PaymentDto,
  UpdateEntryDto,
  UpdatePaymentDto,
} from './ledger.dto';
import { Payment } from './payment.entity';

export interface PaymentView {
  id: string;
  entryId: string;
  date: string;
  amount: number;
  payerName: string | null;
  source: string | null;
  account: { id: string; title: string } | null;
  note: string | null;
}

export interface EntryView {
  id: string;
  patientId: string;
  date: string;
  category: Entry['category'];
  doctor: { id: string; name: string } | null;
  amount: number;
  description: string | null;
  paid: number;
  /** What is still owed on this entry; negative for a deposit's credit. */
  remaining: number;
  payments: PaymentView[];
}

/** Entries and the payments against them — every write that moves a balance. */
@Injectable()
export class LedgerService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** The patient's account, newest entry first. */
  async entriesOf(patientId: string): Promise<EntryView[]> {
    const entries = await this.db.getRepository(Entry).find({
      where: { patientId },
      relations: { doctor: true, payments: { account: true } },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
    return entries.map(toEntryView);
  }

  async getEntry(
    id: string,
    manager: EntityManager = this.db.manager,
  ): Promise<EntryView> {
    const entry = await manager.getRepository(Entry).findOne({
      where: { id },
      relations: { doctor: true, payments: { account: true } },
    });
    if (!entry) throw new NotFoundError('entry_not_found');
    return toEntryView(entry);
  }

  /**
   * One visit as the sheet records it: what was done and what it cost, with
   * whatever was paid there and then — and, if asked, the patient's deposits
   * applied to what is left. A new patient can be created with it.
   */
  createEntry(dto: EntryDto): Promise<EntryView> {
    return this.db.transaction(async (m) => {
      const patientId = await this.resolvePatient(m, dto);
      await this.checkDoctor(m, dto.doctorId);
      for (const payment of dto.payments ?? [])
        await this.checkAccount(m, payment.accountId);
      const entry = await m.getRepository(Entry).save(
        m.getRepository(Entry).create({
          patientId,
          date: dto.date,
          category: dto.category,
          doctorId: dto.doctorId ?? null,
          amount: dto.category === 'deposit' ? 0 : dto.amount,
          description: dto.description ?? null,
        }),
      );
      for (const payment of dto.payments ?? []) {
        await m.getRepository(Payment).save(toPayment(entry.id, payment));
      }
      if (dto.applyDeposits) {
        await this.moveDeposits(m, await this.getEntry(entry.id, m));
      }
      return this.getEntry(entry.id, m);
    });
  }

  /** Puts the patient's deposits toward what is still owed on this entry. */
  applyDeposits(entryId: string): Promise<EntryView> {
    return this.db.transaction(async (m) => {
      const target = await this.getEntry(entryId, m);
      if (!takesDeposits(target)) throw new InvalidInputError('nothing_owed');
      if (!(await this.moveDeposits(m, target))) {
        throw new InvalidInputError('no_deposit');
      }
      return this.getEntry(entryId, m);
    });
  }

  updateEntry(id: string, dto: UpdateEntryDto): Promise<EntryView> {
    return this.db.transaction(async (m) => {
      const repo = m.getRepository(Entry);
      const entry = await repo.findOneBy({ id });
      if (!entry) throw new NotFoundError('entry_not_found');
      if (dto.doctorId !== undefined) await this.checkDoctor(m, dto.doctorId);
      if (dto.date !== undefined) entry.date = dto.date;
      if (dto.category !== undefined) entry.category = dto.category;
      if (dto.doctorId !== undefined) entry.doctorId = dto.doctorId;
      if (dto.amount !== undefined) entry.amount = dto.amount;
      if (dto.description !== undefined) entry.description = dto.description;
      if (entry.category === 'deposit') entry.amount = 0;
      await repo.save(entry);
      return this.getEntry(id, m);
    });
  }

  async deleteEntry(id: string): Promise<void> {
    const result = await this.db.getRepository(Entry).delete({ id });
    if (!result.affected) throw new NotFoundError('entry_not_found');
  }

  addPayment(entryId: string, dto: PaymentDto): Promise<EntryView> {
    return this.db.transaction(async (m) => {
      if (!(await m.getRepository(Entry).existsBy({ id: entryId }))) {
        throw new NotFoundError('entry_not_found');
      }
      await this.checkAccount(m, dto.accountId);
      await m.getRepository(Payment).save(toPayment(entryId, dto));
      return this.getEntry(entryId, m);
    });
  }

  updatePayment(id: string, dto: UpdatePaymentDto): Promise<EntryView> {
    return this.db.transaction(async (m) => {
      const repo = m.getRepository(Payment);
      const payment = await repo.findOneBy({ id });
      if (!payment) throw new NotFoundError('payment_not_found');
      if (dto.accountId !== undefined)
        await this.checkAccount(m, dto.accountId);
      if (dto.date !== undefined) payment.date = dto.date;
      if (dto.amount !== undefined) payment.amount = dto.amount;
      if (dto.payerName !== undefined) payment.payerName = dto.payerName;
      if (dto.source !== undefined) payment.source = dto.source;
      if (dto.accountId !== undefined) payment.accountId = dto.accountId;
      if (dto.note !== undefined) payment.note = dto.note;
      await repo.save(payment);
      return this.getEntry(payment.entryId, m);
    });
  }

  async deletePayment(id: string): Promise<EntryView> {
    const payment = await this.db.getRepository(Payment).findOneBy({ id });
    if (!payment) throw new NotFoundError('payment_not_found');
    await this.db.getRepository(Payment).delete({ id });
    return this.getEntry(payment.entryId);
  }

  /**
   * Moves deposit payments onto the entry, oldest first, up to what is owed
   * on it; a payment larger than that is split. A deposit left empty goes,
   * its description kept as the note of the payments that came from it.
   * Returns what was applied.
   */
  private async moveDeposits(
    m: EntityManager,
    target: EntryView,
  ): Promise<number> {
    if (!takesDeposits(target)) return 0;
    const repo = m.getRepository(Payment);
    const held = await repo.find({
      where: { entry: { patientId: target.patientId, category: 'deposit' } },
      relations: { entry: true },
      order: { date: 'ASC', createdAt: 'ASC' },
    });
    const plan = planDeposits(target.remaining, held);
    const carried = (p: Payment) => ({
      entryId: target.id,
      note: p.note ?? p.entry?.description ?? null,
    });
    for (const p of plan.move) await repo.update(p.id, carried(p));
    if (plan.split) {
      const { payment: p, amount } = plan.split;
      await repo.update(p.id, { amount: p.amount - amount });
      await repo.save(
        repo.create({
          date: p.date,
          payerName: p.payerName,
          source: p.source,
          accountId: p.accountId,
          ...carried(p),
          amount,
        }),
      );
    }
    if (plan.emptied.length) {
      await m.getRepository(Entry).delete({ id: In(plan.emptied) });
    }
    return plan.applied;
  }

  private async resolvePatient(
    m: EntityManager,
    dto: EntryDto,
  ): Promise<string> {
    if (dto.patientId) {
      if (!(await m.getRepository(Patient).existsBy({ id: dto.patientId }))) {
        throw new NotFoundError('patient_not_found');
      }
      return dto.patientId;
    }
    if (!dto.patientName) throw new InvalidInputError('patient_required');
    const patient = await m.getRepository(Patient).save(
      m.getRepository(Patient).create({
        name: dto.patientName,
        phone: dto.patientPhone ?? null,
      }),
    );
    return patient.id;
  }

  private async checkDoctor(
    m: EntityManager,
    id: string | null | undefined,
  ): Promise<void> {
    if (id && !(await m.getRepository(Doctor).existsBy({ id }))) {
      throw new NotFoundError('doctor_not_found');
    }
  }

  private async checkAccount(
    m: EntityManager,
    id: string | null | undefined,
  ): Promise<void> {
    if (id && !(await m.getRepository(Account).existsBy({ id }))) {
      throw new NotFoundError('account_not_found');
    }
  }
}

function toPayment(entryId: string, dto: PaymentDto): Partial<Payment> {
  return {
    entryId,
    date: dto.date,
    amount: dto.amount,
    payerName: dto.payerName ?? null,
    source: dto.source ?? null,
    accountId: dto.accountId ?? null,
    note: dto.note ?? null,
  };
}

function toEntryView(entry: Entry): EntryView {
  const payments = [...(entry.payments ?? [])].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  return {
    id: entry.id,
    patientId: entry.patientId,
    date: entry.date,
    category: entry.category,
    doctor: entry.doctor
      ? { id: entry.doctor.id, name: entry.doctor.name }
      : null,
    amount: entry.amount,
    description: entry.description,
    paid,
    remaining: entry.amount - paid,
    payments: payments.map((p) => ({
      id: p.id,
      entryId: p.entryId,
      date: p.date,
      amount: p.amount,
      payerName: p.payerName,
      source: p.source,
      account: p.account ? { id: p.account.id, title: p.account.title } : null,
      note: p.note,
    })),
  };
}
