import { z } from 'zod';

export const AuditActionEnum = {
  APPROVAL_GRANTED: 'APPROVAL_GRANTED',
  APPROVAL_INVALIDATED: 'APPROVAL_INVALIDATED',
  BUFFER_SUBMISSION: 'BUFFER_SUBMISSION',
  PAUSE_TOGGLED: 'PAUSE_TOGGLED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  CONTENT_CREATED: 'CONTENT_CREATED',
  CONTENT_EDITED: 'CONTENT_EDITED',
  CONTENT_REJECTED: 'CONTENT_REJECTED',
} as const;

export type AuditAction = (typeof AuditActionEnum)[keyof typeof AuditActionEnum];

export const auditEventSchema = z.object({
  id: z.string().min(1),
  action: z.enum([
    AuditActionEnum.APPROVAL_GRANTED,
    AuditActionEnum.APPROVAL_INVALIDATED,
    AuditActionEnum.BUFFER_SUBMISSION,
    AuditActionEnum.PAUSE_TOGGLED,
    AuditActionEnum.SETTINGS_UPDATED,
    AuditActionEnum.CONTENT_CREATED,
    AuditActionEnum.CONTENT_EDITED,
    AuditActionEnum.CONTENT_REJECTED,
  ]),
  actor: z.string().min(1),
  targetId: z.string().optional(),
  targetType: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  ipAddress: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type AuditEvent = z.infer<typeof auditEventSchema>;
