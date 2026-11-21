export const ContentStatusEnum = {
  IDEA: 'idea',
  RESEARCHED: 'researched',
  DRAFT: 'draft',
  NEEDS_REVIEW: 'needs_review',
  APPROVED: 'approved',
  SUBMITTED_TO_BUFFER: 'submitted_to_buffer',
  QUEUED: 'queued',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
  NEEDS_SOURCE_REVIEW: 'needs_source_review',
  PAUSED: 'paused',
} as const;

export type ContentStatus = (typeof ContentStatusEnum)[keyof typeof ContentStatusEnum];

export const ContentFormatEnum = {
  SINGLE_POST: 'single_post',
  EDUCATIONAL_TIP: 'educational_tip',
  BUILD_IN_PUBLIC: 'build_in_public',
  OPINION_WITH_REASONING: 'opinion_with_reasoning',
  THREAD_DRAFT: 'thread_draft',
} as const;

export type ContentFormat = (typeof ContentFormatEnum)[keyof typeof ContentFormatEnum];
