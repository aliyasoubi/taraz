import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { bigintToNumber } from '../../common/bigint.transformer';
import { Doctor } from '../catalog/doctor.entity';
import { Patient } from '../patients/patient.entity';
import type { Category } from './categories';
import { Payment } from './payment.entity';

/**
 * One row of the patient's account: a treatment, an implant, a deposit or a
 * product sale, with what it cost. What was paid against it hangs off it as
 * payments; the patient owes the sum of costs less the sum of payments.
 */
@Entity('entries')
export class Entry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  /** Gregorian `yyyy-MM-dd`. */
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 24 })
  category: Category;

  @Column({ name: 'doctor_id', type: 'uuid', nullable: true })
  doctorId: string | null;

  @ManyToOne(() => Doctor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: Doctor | null;

  /** Cost in rials; 0 for a deposit. */
  @Column({ type: 'bigint', default: 0, transformer: bigintToNumber })
  amount: number;

  @Column({ type: 'varchar', length: 300, nullable: true })
  description: string | null;

  @OneToMany(() => Payment, (payment) => payment.entry)
  payments?: Payment[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
