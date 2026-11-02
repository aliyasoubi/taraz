import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { bigintToNumber } from '../../common/bigint.transformer';
import { Account } from '../catalog/account.entity';
import type { Entry } from './entry.entity';

/**
 * Money received against an entry, recorded like a transfer: who paid
 * (`payerName`, null when it was the patient), from where (`source` — their
 * bank or card, as told), and into which account (`account`).
 */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entry_id', type: 'uuid' })
  entryId: string;

  @ManyToOne('Entry', 'payments', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entry_id' })
  entry?: Entry;

  /** Gregorian `yyyy-MM-dd`. */
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'bigint', transformer: bigintToNumber })
  amount: number;

  @Column({ name: 'payer_name', type: 'varchar', length: 120, nullable: true })
  payerName: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  source: string | null;

  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId: string | null;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account?: Account | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
