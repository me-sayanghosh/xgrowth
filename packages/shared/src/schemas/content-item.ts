import { z } from 'zod';
import { ContentStatusEnum, ContentFormatEnum } from '../enums/content.js';

export const contentStatusSchema = z.enum([
  ContentStatusEnum.IDEA,
  ContentStatusEnum.RESEARCHED,
  ContentStatusEnum.DRAFT,
  ContentStatusEnum.NEEDS_REVIEW,
  ContentStatusEnum.APPROVED,
  ContentStatusEnum.SUBMITTED_TO_BUFFER,
  ContentStatusEnum.QUEUED,
  ContentStatusEnum.PUBLISHED,
  ContentStatusEnum.REJECTED,
  ContentStatusEnum.ARCHIVED,
  ContentStatusEnum.FAILED,
  ContentStatusEnum.UNKNOWN,
  ContentStatusEnum.NEEDS_SOURCE_REVIEW,
  ContentStatusEnum.PAUSED,
]);

export const contentFormatSchema = z.enum([
  ContentFormatEnum.SINGLE_POST,
  ContentFormatEnum.EDUCATIONAL_TIP,
  ContentFormatEnum.BUILD_IN_PUBLIC,
  ContentFormatEnum.OPINION_WITH_REASONING,
  ContentFormatEnum.THREAD_DRAFT,
]);

export const approvalRecordSchema = z.object({
  approvedBy: z.string().min(1),
  approvedAt: z.string().datetime(),
  approvedHash: z.string().min(1),
});

export const bufferSubmissionMetadataSchema = z.object({
  channelId: z.string().optional(),
  submissionId: z.string().optional(),
  providerStatus: z.string().optional(),
  submittedAt: z.string().datetime().optional(),
  lastCheckedAt: z.string().datetime().optional(),
  errorCode: z.string().optional(),
});

export const contentItemSchema = z.object({
  id: z.string().min(1),
  status: contentStatusSchema,
  format: contentFormatSchema,
  text: z.string().max(10000),
  threadParts: z.array(z.string()).optional(),
  topicPillar: z.string().optional(),
  audience: z.string().optional(),
  sourceUrls: z.array(z.string().url()).optional(),
  researchNotes: z.string().optional(),
  qualityFlags: z.array(z.string()).optional(),
  riskFlags: z.array(z.string()).optional(),
  contentHash: z.string().optional(),
  approval: approvalRecordSchema.nullable().optional(),
  buffer: bufferSubmissionMetadataSchema.nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ContentItem = z.infer<typeof contentItemSchema>;
export type ContentItemInput = z.input<typeof contentItemSchema>;
export type ApprovalRecord = z.infer<typeof approvalRecordSchema>;
export type BufferSubmissionMetadata = z.infer<typeof bufferSubmissionMetadataSchema>;
