import mongoose, { Schema, Document } from 'mongoose';

export interface ApprovalRecordDocument extends Document {
  contentItemId: mongoose.Types.ObjectId;
  approvedBy: string;
  approvedAt: Date;
  approvedHash: string;
  snapshotText: string;
  snapshotThreadParts: string[];
  channelId?: string;
  createdAt: Date;
}

const ApprovalRecordSchema = new Schema<ApprovalRecordDocument>(
  {
    contentItemId: {
      type: Schema.Types.ObjectId,
      ref: 'ContentItem',
      required: true,
      index: true,
    },
    approvedBy: { type: String, required: true },
    approvedAt: { type: Date, required: true },
    approvedHash: { type: String, required: true },
    snapshotText: { type: String, required: true },
    snapshotThreadParts: { type: [String], default: [] },
    channelId: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable append-only
  },
);

ApprovalRecordSchema.index({ contentItemId: 1, createdAt: -1 });

export const ApprovalRecordModel =
  mongoose.models.ApprovalRecord ||
  mongoose.model<ApprovalRecordDocument>('ApprovalRecord', ApprovalRecordSchema);
