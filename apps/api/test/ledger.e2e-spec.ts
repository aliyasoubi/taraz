import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { monthOf, monthRange } from '../src/common/jalali';
import { hashPassword } from '../src/modules/auth/auth.service';

/**
 * The ledger through HTTP, against a real database. Writes, so it runs only on
 * a throwaway one: `DB_NAME=taraz_e2e npm run test:e2e` after migrating it.
 */
const throwaway = /_(e2e|test)$/.test(process.env.DB_NAME ?? '');
const describeIf = throwaway ? describe : describe.skip;

describeIf('ledger (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let cookie: string[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    await db.query(
      'TRUNCATE payments, entries, patients, accounts, doctors, users CASCADE',
    );
    await db.query(
      `INSERT INTO users (username, full_name, password_hash) VALUES ('tester', 'Tester', $1)`,
      [await hashPassword('test-password')],
    );
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'tester', password: 'test-password' })
      .expect(200);
    cookie = login.get('Set-Cookie') ?? [];
  });

  afterAll(async () => {
    await db.query(
      'TRUNCATE payments, entries, patients, accounts, doctors, users CASCADE',
    );
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  it('refuses a request without a session, and a wrong password', async () => {
    await api().get('/api/patients').expect(401);
    const res = await api()
      .post('/api/auth/login')
      .send({ username: 'tester', password: 'nope' })
      .expect(400);
    expect(res.body).toMatchObject({ code: 'invalid_credentials' });
  });

  it('records a visit with a payment and keeps the balance', async () => {
    const doctor = await api()
      .post('/api/doctors')
      .set('Cookie', cookie)
      .send({ name: 'Dr Test' })
      .expect(201);
    const account = await api()
      .post('/api/accounts')
      .set('Cookie', cookie)
      .send({ title: 'Test Card', kind: 'bank' })
      .expect(201);
    const today = new Date().toISOString().slice(0, 10);

    const entry = await api()
      .post('/api/entries')
      .set('Cookie', cookie)
      .send({
        patientName: 'Test Patient',
        date: today,
        category: 'implant',
        doctorId: doctor.body.id,
        amount: 1_000_000,
        payments: [
          {
            date: today,
            amount: 400_000,
            payerName: 'Someone Else',
            source: 'Their bank',
            accountId: account.body.id,
          },
        ],
      })
      .expect(201);
    expect(entry.body).toMatchObject({ paid: 400_000, remaining: 600_000 });

    await api()
      .post(`/api/entries/${entry.body.id}/payments`)
      .set('Cookie', cookie)
      .send({ date: today, amount: 100_000 })
      .expect(201);

    const debtors = await api()
      .get('/api/patients?status=debtor')
      .set('Cookie', cookie)
      .expect(200);
    expect(debtors.body.items).toEqual([
      expect.objectContaining({ name: 'Test Patient', balance: 500_000 }),
    ]);

    const month = monthOf(today);
    const report = await api()
      .get(`/api/reports/month?year=${month.year}&month=${month.month}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(report.body.month).toEqual(monthRange(month));
    expect(report.body.totals).toMatchObject({
      charged: 1_000_000,
      paid: 500_000,
      debt: 500_000,
      debtors: 1,
    });
    expect(report.body.byAccount).toContainEqual(
      expect.objectContaining({ title: 'Test Card', amount: 400_000 }),
    );

    const workbook = await api()
      .get(`/api/reports/month/export?year=${month.year}&month=${month.month}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(workbook.headers['content-type']).toContain('spreadsheetml');
  });

  it('applies a deposit to the treatment it was paid for', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const deposit = await api()
      .post('/api/entries')
      .set('Cookie', cookie)
      .send({
        patientName: 'Deposit Patient',
        date: today,
        category: 'deposit',
        amount: 0,
        description: 'Implant deposit',
        payments: [{ date: today, amount: 5_000_000 }],
      })
      .expect(201);
    const patientId: string = deposit.body.patientId;

    // Entered with the deposit applied: the deposit row goes, its money stays.
    const implant = await api()
      .post('/api/entries')
      .set('Cookie', cookie)
      .send({
        patientId,
        date: today,
        category: 'implant',
        amount: 30_000_000,
        applyDeposits: true,
      })
      .expect(201);
    expect(implant.body).toMatchObject({
      paid: 5_000_000,
      remaining: 25_000_000,
      payments: [
        expect.objectContaining({ amount: 5_000_000, note: 'Implant deposit' }),
      ],
    });
    let patient = await api()
      .get(`/api/patients/${patientId}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(patient.body).toMatchObject({ balance: 25_000_000, deposits: 0 });
    expect(patient.body.entries).toHaveLength(1);

    // Applied later, to a cost smaller than the deposit: only what is owed moves.
    await api()
      .post('/api/entries')
      .set('Cookie', cookie)
      .send({
        patientId,
        date: today,
        category: 'deposit',
        amount: 0,
        payments: [{ date: today, amount: 10_000_000 }],
      })
      .expect(201);
    const visit = await api()
      .post('/api/entries')
      .set('Cookie', cookie)
      .send({
        patientId,
        date: today,
        category: 'treatment',
        amount: 3_000_000,
      })
      .expect(201);
    const applied = await api()
      .post(`/api/entries/${visit.body.id}/apply-deposits`)
      .set('Cookie', cookie)
      .expect(200);
    expect(applied.body).toMatchObject({ paid: 3_000_000, remaining: 0 });
    patient = await api()
      .get(`/api/patients/${patientId}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(patient.body).toMatchObject({
      balance: 18_000_000,
      deposits: 7_000_000,
    });

    const again = await api()
      .post(`/api/entries/${visit.body.id}/apply-deposits`)
      .set('Cookie', cookie)
      .expect(400);
    expect(again.body).toMatchObject({ code: 'nothing_owed' });

    const month = monthOf(today);
    const report = await api()
      .get(`/api/reports/month?year=${month.year}&month=${month.month}`)
      .set('Cookie', cookie)
      .expect(200);
    // What was received now counts toward the treatment; only the rest is a deposit.
    expect(report.body.byCategory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'treatment', paid: 3_000_000 }),
        expect.objectContaining({ category: 'deposit', paid: 7_000_000 }),
      ]),
    );
  });

  it('finds a patient by the new name once renamed', async () => {
    const created = await api()
      .post('/api/patients')
      .set('Cookie', cookie)
      .send({ name: 'Old Name' })
      .expect(201);
    await api()
      .patch(`/api/patients/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Renamed Patient' })
      .expect(200);
    const found = await api()
      .get('/api/patients?q=renamed')
      .set('Cookie', cookie)
      .expect(200);
    expect(found.body.items).toEqual([
      expect.objectContaining({ id: created.body.id }),
    ]);
  });

  it('answers a bad body with field codes, not prose', async () => {
    const res = await api()
      .post('/api/entries')
      .set('Cookie', cookie)
      .send({ date: 'yesterday', category: 'other', amount: -5 })
      .expect(400);
    expect(Object.keys(res.body.fieldErrors).sort()).toEqual([
      'amount',
      'category',
      'date',
    ]);
  });
});
