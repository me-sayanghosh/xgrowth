import { z } from 'zod';

export const metricRecordSchema = z.object({
  name: z.string(),
  value: z.number().nullable(),
  available: z.boolean(),
  unavailableReason: z.string().optional(),
  source: z.string(),
  recordedAt: z.string().datetime(),
});

export type MetricRecord = z.infer<typeof metricRecordSchema>;

export const analyticsSnapshotSchema = z.object({
  id: z.string().min(1),
  contentItemId: z.string().min(1),
  channelId: z.string().min(1),
  metrics: z.record(metricRecordSchema),
  rawPayload: z.record(z.unknown()).optional(),
  fetchedAt: z.string().datetime(),
});

export type AnalyticsSnapshot = z.infer<typeof analyticsSnapshotSchema>;

export const topContentItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  topicPillar: z.string(),
  format: z.string(),
  metricsSummary: z.string(),
  notes: z.string(),
});

export const weeklyReportSchema = z.object({
  id: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  totalPublished: z.number().int(),
  summaryMetrics: z.record(z.union([z.number(), z.string()])),
  topContent: z.array(topContentItemSchema),
  whatWorked: z.array(z.string()),
  whatNeedsTesting: z.array(z.string()),
  nextExperiments: z.array(z.string()),
  markdownReport: z.string(),
  generatedAt: z.string().datetime(),
});

export type WeeklyReport = z.infer<typeof weeklyReportSchema>;
