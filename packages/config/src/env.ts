import fs from 'fs';
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const cwdEnvPath = path.resolve(process.cwd(), '.env');
const rootEnvPath = path.resolve(repoRoot, '.env');

// Load environment from cwd .env or fallback to monorepo root .env (important for MCP launches)
dotenv.config({ path: fs.existsSync(cwdEnvPath) ? cwdEnvPath : rootEnvPath });

export function getRepoRoot(): string {
  return repoRoot;
}

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:3000'),
  APP_SESSION_SECRET: z.string().min(16).default('development_random_secret_at_least_16_chars'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/xgrowth_ai'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().optional().default('gemini-2.5-flash'),
  BUFFER_API_KEY: z.string().optional().default(''),
  NOTIFICATION_PROVIDER: z.string().optional().default(''),
  NOTIFICATION_API_KEY: z.string().optional().default(''),
  NOTIFICATION_TARGET: z.string().optional().default(''),
  XGROWTH_MODE: z.enum(['local', 'http']).optional().default('local'),
  XGROWTH_DATA_DIR: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(override?: Record<string, string | undefined>): Env {
  if (cachedEnv && !override) {
    return cachedEnv;
  }
  const parsed = envSchema.parse(override ?? process.env);
  if (!override) {
    cachedEnv = parsed;
  }
  return parsed;
}
