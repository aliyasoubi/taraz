import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { searchKey } from '../../common/persian-text';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  /**
   * `searchKey(name)` — Arabic/Persian letter variants and digits folded, for
   * search and matching. Derived on every save; never set it by hand.
   */
  @Column({ name: 'name_key', length: 120 })
  nameKey: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  deriveNameKey(): void {
    // A partial save may carry no name; the stored key is still right then.
    if (this.name) this.nameKey = searchKey(this.name);
  }
}
