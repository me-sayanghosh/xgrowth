import { z } from 'zod';

export const canonicalHashInputSchema = z.object({
  text: z.string(),
  threadParts: z.array(z.string()).optional().default([]),
  channelId: z.string().optional().default(''),
  mediaUrls: z.array(z.string().url()).optional().default([]),
});

export type CanonicalHashInput = z.infer<typeof canonicalHashInputSchema>;

export const approvalActionInputSchema = z.object({
  contentItemId: z.string().min(1),
  approvedBy: z.string().min(1),
  channelId: z.string().optional(),
});

export type ApprovalActionInput = z.infer<typeof approvalActionInputSchema>;

export const approvalSnapshotSchema = z.object({
  contentItemId: z.string().min(1),
  approvedBy: z.string().min(1),
  approvedAt: z.string().datetime(),
  approvedHash: z.string().min(1),
  snapshotText: z.string(),
  channelId: z.string().optional(),
});

export type ApprovalSnapshot = z.infer<typeof approvalSnapshotSchema>;
