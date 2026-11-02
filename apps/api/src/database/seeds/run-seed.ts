import 'reflect-metadata';

import { text } from '../../i18n';
import { hashPassword } from '../../modules/auth/auth.service';
import { User } from '../../modules/auth/user.entity';
import { Account } from '../../modules/catalog/account.entity';
import { Doctor } from '../../modules/catalog/doctor.entity';
import dataSource from '../data-source';

/**
 * Fills an empty database with what the app needs before the first entry:
 * the sign-in, the practice's four doctors, and the card terminal and cash box
 * as the first two destination accounts. Safe to re-run — nothing that already
 * exists is touched.
 */
async function main(): Promise<void> {
  const username = process.env.SEED_ADMIN_USERNAME?.trim() || 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(User);
    if (!(await users.existsBy({ username }))) {
      if (password.length < 8) {
        throw new Error(
          'Set SEED_ADMIN_PASSWORD (8+ characters) to create the first sign-in',
        );
      }
      await users.save(
        users.create({
          username,
          fullName: text.seed.adminName,
          passwordHash: await hashPassword(password),
        }),
      );
      console.log(`Created the sign-in "${username}".`);
    }

    const doctors = dataSource.getRepository(Doctor);
    if ((await doctors.count()) === 0) {
      await doctors.save(
        text.seed.doctors.map((name, sortOrder) =>
          doctors.create({ name, sortOrder }),
        ),
      );
      console.log(`Added ${text.seed.doctors.length} doctors.`);
    }

    const accounts = dataSource.getRepository(Account);
    if ((await accounts.count()) === 0) {
      await accounts.save(
        text.seed.accounts.map((a, sortOrder) =>
          accounts.create({
            title: a.title,
            kind: a.kind as Account['kind'],
            sortOrder,
          }),
        ),
      );
      console.log(`Added ${text.seed.accounts.length} accounts.`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
