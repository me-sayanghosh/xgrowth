import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment from root .env if running in Node
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
