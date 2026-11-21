import mongoose, { Schema, Document } from 'mongoose';

export interface ProviderSubmissionDocument extends Document {
  contentItemId: mongoose.Types.ObjectId;
  channelId: string;
  idempotencyKey: string;
  providerPostId?: string;
  status: 'pending' | 'submitted' | 'queued' | 'published' | 'failed' | 'unknown';
  requestPayload: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  attemptCount: number;
  lastAttemptAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderSubmissionSchema = new Schema<ProviderSubmissionDocument>(
  {
    contentItemId: {
      type: Schema.Types.ObjectId,
      ref: 'ContentItem',
      required: true,
      index: true,
    },
    channelId: { type: String, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    providerPostId: { type: String, index: true },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'queued', 'published', 'failed', 'unknown'],
      default: 'pending',
      index: true,
    },
    requestPayload: { type: Schema.Types.Mixed, required: true },
    responsePayload: { type: Schema.Types.Mixed },
    errorCode: { type: String },
    errorMessage: { type: String },
    attemptCount: { type: Number, default: 1 },
    lastAttemptAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

ProviderSubmissionSchema.index({ contentItemId: 1, status: 1 });

export const ProviderSubmissionModel =
  mongoose.models.ProviderSubmission ||
  mongoose.model<ProviderSubmissionDocument>('ProviderSubmission', ProviderSubmissionSchema);
