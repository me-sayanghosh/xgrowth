import mongoose, { Schema, Document } from 'mongoose';

export interface AnalyticsSnapshotDocument extends Document {
  contentItemId: mongoose.Types.ObjectId;
  channelId: string;
  providerPostId?: string;
  metrics: Record<
    string,
    {
      value: number | null;
      available: boolean;
      unavailableReason?: string;
      source: string;
      recordedAt: Date;
    }
  >;
  rawPayload?: Record<string, unknown>;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsSnapshotSchema = new Schema<AnalyticsSnapshotDocument>(
  {
    contentItemId: {
      type: Schema.Types.ObjectId,
      ref: 'ContentItem',
      required: true,
      index: true,
    },
    channelId: { type: String, required: true },
    providerPostId: { type: String, index: true },
    metrics: { type: Schema.Types.Mixed, required: true },
    rawPayload: { type: Schema.Types.Mixed },
    fetchedAt: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
  },
);

AnalyticsSnapshotSchema.index({ contentItemId: 1, fetchedAt: -1 });

export const AnalyticsSnapshotModel: mongoose.Model<AnalyticsSnapshotDocument> =
  (mongoose.models.AnalyticsSnapshot as mongoose.Model<AnalyticsSnapshotDocument>) ||
  mongoose.model<AnalyticsSnapshotDocument>('AnalyticsSnapshot', AnalyticsSnapshotSchema);
