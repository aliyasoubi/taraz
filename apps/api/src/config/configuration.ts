import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';

// The repository root's `.env` first, then one beside the process (a container
// passes its environment directly and has neither).
loadEnv({ path: join(__dirname, '../../../../.env'), quiet: true });
loadEnv({ quiet: true });

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  corsOrigin: string[];
  trustProxy: number;
  timezone: string;
  /** The built web app to serve beside the API (production); null in development. */
  webDist: string | null;
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  auth: {
    jwtSecret: string;
    sessionDays: number;
    cookieSecure: boolean;
  };
}

const DEV_SECRET = 'dev-only-secret-change-me';

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Every setting the API reads, from the environment, in one place. Production
 * refuses to start on a missing or development secret rather than signing
 * sessions anyone could forge.
 */
export function buildConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const mode =
    env.NODE_ENV === 'production' || env.NODE_ENV === 'test'
      ? env.NODE_ENV
      : 'development';
  const jwtSecret = env.JWT_SECRET?.trim() || DEV_SECRET;
  if (
    mode === 'production' &&
    (jwtSecret === DEV_SECRET || jwtSecret.length < 32)
  ) {
    throw new Error(
      'JWT_SECRET must be set to at least 32 characters in production',
    );
  }
  return {
    env: mode,
    port: int(env.API_PORT, 3400),
    corsOrigin: (env.CORS_ORIGIN ?? 'http://localhost:4400')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    trustProxy: int(env.TRUST_PROXY, mode === 'production' ? 1 : 0),
    timezone: env.CLINIC_TIMEZONE?.trim() || 'Asia/Tehran',
    webDist: env.WEB_DIST?.trim() || null,
    db: {
      host: env.DB_HOST ?? 'localhost',
      port: int(env.DB_PORT, 5432),
      username: env.DB_USER ?? 'dental',
      password: env.DB_PASSWORD ?? '',
      database: env.DB_NAME ?? 'taraz',
    },
    auth: {
      jwtSecret,
      sessionDays: int(env.SESSION_DAYS, 30),
      cookieSecure:
        (env.COOKIE_SECURE ?? String(mode === 'production')) === 'true',
    },
  };
}

export default (): AppConfig => buildConfiguration();
