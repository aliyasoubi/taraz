import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const ACCOUNT_KINDS = ['bank', 'pos', 'cash', 'person'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

/**
 * Where a payment lands — the "to" of a payment: a bank account or card, the
 * card terminal, the cash box, or a person the patient was asked to pay
 * directly (the sheet's «بانک - حساب» column).
 */
@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 80, unique: true })
  title: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  holder: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  bank: string | null;

  @Column({ type: 'varchar', length: 16, default: 'bank' })
  kind: AccountKind;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
