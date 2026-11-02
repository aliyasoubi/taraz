import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The ledger: patients, their entries (what was done and what it cost) and the
 * payments made against each entry, plus the doctors and the accounts money
 * is paid into. Balances are never stored — they are always summed from the
 * entries and payments, so they cannot drift from the rows behind them.
 */
export class InitialSchema1795000000000 implements MigrationInterface {
  name = 'InitialSchema1795000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username varchar(60) NOT NULL UNIQUE,
        full_name varchar(120) NOT NULL,
        password_hash varchar(100) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE doctors (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(80) NOT NULL UNIQUE,
        active boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(80) NOT NULL UNIQUE,
        holder varchar(80),
        bank varchar(40),
        kind varchar(16) NOT NULL DEFAULT 'bank'
          CONSTRAINT ck_accounts_kind CHECK (kind IN ('bank', 'pos', 'cash', 'person')),
        active boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);

    await q.query(`
      CREATE TABLE patients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL,
        name_key varchar(120) NOT NULL,
        phone varchar(32),
        note text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX ix_patients_name_key ON patients (name_key)`);

    await q.query(`
      CREATE TABLE entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id uuid NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
        date date NOT NULL,
        category varchar(24) NOT NULL
          CONSTRAINT ck_entries_category CHECK (category IN (
            'treatment', 'implant', 'deposit', 'toothbrush', 'toothpaste', 'floss', 'waterjet'
          )),
        doctor_id uuid REFERENCES doctors (id) ON DELETE RESTRICT,
        amount bigint NOT NULL DEFAULT 0 CONSTRAINT ck_entries_amount CHECK (amount >= 0),
        description varchar(300),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(
      `CREATE INDEX ix_entries_patient_date ON entries (patient_id, date)`,
    );
    await q.query(`CREATE INDEX ix_entries_date ON entries (date)`);

    await q.query(`
      CREATE TABLE payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_id uuid NOT NULL REFERENCES entries (id) ON DELETE CASCADE,
        date date NOT NULL,
        amount bigint NOT NULL CONSTRAINT ck_payments_amount CHECK (amount > 0),
        payer_name varchar(120),
        source varchar(120),
        account_id uuid REFERENCES accounts (id) ON DELETE RESTRICT,
        note varchar(300),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX ix_payments_entry ON payments (entry_id)`);
    await q.query(`CREATE INDEX ix_payments_date ON payments (date)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE payments`);
    await q.query(`DROP TABLE entries`);
    await q.query(`DROP TABLE patients`);
    await q.query(`DROP TABLE accounts`);
    await q.query(`DROP TABLE doctors`);
    await q.query(`DROP TABLE users`);
  }
}
