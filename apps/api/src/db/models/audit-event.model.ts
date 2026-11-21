import mongoose, { Schema, Document } from 'mongoose';
import { AuditAction } from '@xgrowth/shared';

export interface AuditEventDocument extends Document {
  action: AuditAction;
  actor: string;
  targetId?: string;
  targetType?: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  timestamp: Date;
}

const AuditEventSchema = new Schema<AuditEventDocument>(
  {
    action: { type: String, required: true, index: true },
    actor: { type: String, required: true, index: true },
    targetId: { type: String, index: true },
    targetType: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable append-only
  },
);

AuditEventSchema.index({ action: 1, timestamp: -1 });

export const AuditEventModel: mongoose.Model<AuditEventDocument> =
  (mongoose.models.AuditEvent as mongoose.Model<AuditEventDocument>) ||
  mongoose.model<AuditEventDocument>('AuditEvent', AuditEventSchema);
