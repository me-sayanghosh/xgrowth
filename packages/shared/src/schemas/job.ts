import { z } from 'zod';

export const ScheduledJobTypeEnum = {
  RESEARCH_SYNC: 'RESEARCH_SYNC',
  STATUS_RECONCILIATION: 'STATUS_RECONCILIATION',
  ANALYTICS_IMPORT: 'ANALYTICS_IMPORT',
} as const;

export type ScheduledJobType = (typeof ScheduledJobTypeEnum)[keyof typeof ScheduledJobTypeEnum];

export const jobExecutionLogSchema = z.object({
  runAt: z.string().datetime(),
  durationMs: z.number(),
  status: z.enum(['success', 'failed']),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type JobExecutionLog = z.infer<typeof jobExecutionLogSchema>;

export const scheduledJobSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  type: z.enum([
    ScheduledJobTypeEnum.RESEARCH_SYNC,
    ScheduledJobTypeEnum.STATUS_RECONCILIATION,
    ScheduledJobTypeEnum.ANALYTICS_IMPORT,
  ]),
  cronExpression: z.string(),
  enabled: z.boolean().default(true),
  lastRunAt: z.string().datetime().optional(),
  nextRunAt: z.string().datetime().optional(),
  status: z.enum(['idle', 'running', 'failed']).default('idle'),
  lockedUntil: z.string().datetime().optional(),
  logs: z.array(jobExecutionLogSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ScheduledJob = z.infer<typeof scheduledJobSchema>;
