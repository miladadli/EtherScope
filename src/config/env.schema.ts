import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  ENABLE_INDEXER: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  RPC_URL: z.string().url().default('http://127.0.0.1:8545'),
  CONFIRMATION_DEPTH: z.coerce.number().int().nonnegative().default(2),
  BATCH_SIZE_LIVE: z.coerce.number().int().positive().default(2),
  BATCH_SIZE_CATCHUP: z.coerce.number().int().positive().default(40),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  TOKEN_ADDRESSES: z.string().default(''),
  SEED_DEFAULT_COUNT: z.coerce.number().int().positive().default(1000),
  MAX_SEED_COUNT: z.coerce.number().int().positive().default(100_000),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }
  return result.data;
}

export function parseTokenAddresses(value: string): `0x${string}`[] {
  if (!value.trim()) {
    return [];
  }
  return value
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as `0x${string}`[];
}
