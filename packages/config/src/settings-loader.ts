import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { z } from 'zod';

export const appSettingsSchema = z.object({
  app: z.object({
    name: z.string().default('XGrowth AI'),
    environment: z.string().default('development'),
    timezone: z.string().default('Asia/Kolkata'),
    default_language: z.string().default('en'),
    supported_languages: z.array(z.string()).default(['en', 'bn', 'mixed']),
  }),
  operation: z.object({
    mode: z.enum(['review_everything', 'approved_category_auto_submit', 'full_auto_submit']).default('review_everything'),
    global_pause: z.boolean().default(true),
    max_posts_per_day: z.number().int().positive().default(3),
    max_buffer_submissions_per_run: z.number().int().positive().default(3),
    require_source_for_current_claims: z.boolean().default(true),
  }),
  publishing: z.object({
    provider: z.literal('buffer').default('buffer'),
    target_channel_label: z.string().default('My X account'),
    default_timezone: z.string().default('Asia/Kolkata'),
    preferred_windows: z.array(z.string()).default(['09:00', '13:00', '19:00']),
    submit_only_approved: z.boolean().default(true),
    retry_ambiguous_submissions: z.boolean().default(false),
  }),
  brand: z.object({
    audience: z.array(z.string()).default(['software developers']),
    pillars: z.array(z.string()).min(1),
    voice: z.object({
      traits: z.array(z.string()),
      avoid: z.array(z.string()),
    }),
    formats: z.array(z.string()),
  }),
  research: z.object({
    daily_candidate_target: z.number().int().default(10),
    source_allowlist: z.array(z.string()).default([]),
    require_source_url: z.boolean().default(true),
    max_age_hours_for_trend: z.number().default(72),
    deduplicate_topics: z.boolean().default(true),
  }),
  ai: z.object({
    provider: z.string().default('gemini'),
    model: z.string().default('gemini-2.5-flash'),
    max_variants_per_brief: z.number().int().default(3),
    temperature: z.number().default(0.7),
  }),
  analytics: z.object({
    weekly_report_day: z.string().default('Monday'),
    weekly_report_time: z.string().default('10:00'),
    show_unavailable_as: z.string().default('Not available from connected provider'),
  }),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export function loadSettingsFromYaml(filePath?: string): AppSettings {
  const resolvedPath = filePath || path.resolve(process.cwd(), 'config/settings.example.yaml');
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Settings file not found at: ${resolvedPath}`);
  }
  const fileContents = fs.readFileSync(resolvedPath, 'utf8');
  const rawParsed = YAML.parse(fileContents);
  return appSettingsSchema.parse(rawParsed);
}
