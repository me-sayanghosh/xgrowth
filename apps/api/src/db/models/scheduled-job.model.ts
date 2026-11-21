import mongoose, { Schema, Document } from 'mongoose';
import { ScheduledJobType } from '@xgrowth/shared';

export interface ScheduledJobDocument extends Document {
  name: string;
  type: ScheduledJobType;
  cronExpression: string;
  enabled: boolean;
  status: 'idle' | 'running' | 'failed';
  lastRunAt?: Date;
  nextRunAt?: Date;
  lockedUntil?: Date;
  logs: Array<{
    runAt: Date;
    durationMs: number;
    status: 'success' | 'failed';
    message?: string;
    error?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledJobSchema = new Schema<ScheduledJobDocument>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true, unique: true },
    cronExpression: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    status: { type: String, enum: ['idle', 'running', 'failed'], default: 'idle', index: true },
    lastRunAt: { type: Date },
    nextRunAt: { type: Date },
    lockedUntil: { type: Date },
    logs: [
      {
        runAt: { type: Date, required: true },
        durationMs: { type: Number, required: true },
        status: { type: String, enum: ['success', 'failed'], required: true },
        message: { type: String },
        error: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const ScheduledJobModel: mongoose.Model<ScheduledJobDocument> =
  (mongoose.models.ScheduledJob as mongoose.Model<ScheduledJobDocument>) ||
  mongoose.model<ScheduledJobDocument>('ScheduledJob', ScheduledJobSchema);
