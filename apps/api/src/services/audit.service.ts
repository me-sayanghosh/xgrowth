import { AuditEventModel } from '../db/models/audit-event.model.js';
import { AuditAction } from '@xgrowth/shared';
import { logger } from '../middlewares/logger.js';

export interface RecordAuditEventInput {
  action: AuditAction;
  actor: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export class AuditService {
  public static async recordEvent(input: RecordAuditEventInput): Promise<void> {
    try {
      const sanitizedMeta = this.sanitizeMetadata(input.metadata || {});

      await AuditEventModel.create({
        action: input.action,
        actor: input.actor,
        targetId: input.targetId,
        targetType: input.targetType,
        metadata: sanitizedMeta,
        ipAddress: input.ipAddress,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error({
        message: 'Failed to record audit event',
        error: (error as Error).message,
        action: input.action,
      });
      // Do not throw to avoid crashing parent flows, but logged
    }
  }

  private static sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
    const copy = { ...meta };
    const sensitiveKeys = ['apiKey', 'token', 'authorization', 'secret', 'password'];

    for (const key of Object.keys(copy)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        copy[key] = '[REDACTED]';
      }
    }
    return copy;
  }
}
