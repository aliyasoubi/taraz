import 'reflect-metadata';
import { types } from 'pg';
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'node:path';

import { buildConfiguration } from '../config/configuration';

const config = buildConfiguration();
process.env.TZ = config.timezone;

// A `date` is a calendar day, not an instant: keep Postgres's `yyyy-MM-dd` as is
// instead of letting `pg` turn it into a Date at some midnight. TypeORM does
// this for entity columns already; raw report queries need it too.
types.setTypeParser(types.builtins.DATE, (value) => value);

/** Connection options shared by the running app, the CLI tools and the tests. */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  ...config.db,
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations/*.{ts,js}')],
  // Schema changes always go through a migration: this database is the only
  // copy of the practice's books.
  synchronize: false,
  migrationsRun: false,
  logging: process.env.DB_LOGGING === 'true' ? 'all' : ['error', 'warn'],
  extra: { options: `-c timezone=${config.timezone}` },
};

/** Stand-alone DataSource for migrations, the seed and the importer. */
export default new DataSource(dataSourceOptions);
