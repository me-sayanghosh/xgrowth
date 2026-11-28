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
  BUFFER_API_KEY: z.string().optional().default(''),
  XGROWTH_DATA_DIR: z.string().optional().default(''),
  NOTIFICATION_PROVIDER: z.string().optional().default(''),
  NOTIFICATION_API_KEY: z.string().optional().default(''),
  NOTIFICATION_TARGET: z.string().optional().default(''),
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
