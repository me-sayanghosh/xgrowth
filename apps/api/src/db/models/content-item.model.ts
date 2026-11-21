import mongoose, { Schema, Document } from 'mongoose';
import { ContentStatus, ContentFormat } from '@xgrowth/shared';

export interface ContentItemDocument extends Document {
  status: ContentStatus;
  format: ContentFormat;
  text: string;
  threadParts: string[];
  topicPillar?: string;
  audience?: string;
  sourceUrls: string[];
  researchNotes?: string;
  qualityFlags: string[];
  riskFlags: string[];
  contentHash?: string;
  approval?: {
    approvedBy: string;
    approvedAt: Date;
    approvedHash: string;
  };
  buffer?: {
    channelId?: string;
    submissionId?: string;
    providerStatus?: string;
    submittedAt?: Date;
    lastCheckedAt?: Date;
    errorCode?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ContentItemSchema = new Schema<ContentItemDocument>(
  {
    status: {
      type: String,
      required: true,
      index: true,
    },
    format: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    threadParts: {
      type: [String],
      default: [],
    },
    topicPillar: {
      type: String,
      index: true,
    },
    audience: {
      type: String,
    },
    sourceUrls: {
      type: [String],
      default: [],
    },
    researchNotes: {
      type: String,
    },
    qualityFlags: {
      type: [String],
      default: [],
    },
    riskFlags: {
      type: [String],
      default: [],
    },
    contentHash: {
      type: String,
    },
    approval: {
      approvedBy: { type: String },
      approvedAt: { type: Date },
      approvedHash: { type: String },
    },
    buffer: {
      channelId: { type: String },
      submissionId: { type: String },
      providerStatus: { type: String },
      submittedAt: { type: Date },
      lastCheckedAt: { type: Date },
      errorCode: { type: String },
    },
  },
  {
    timestamps: true,
  },
);

ContentItemSchema.index({ status: 1, createdAt: -1 });
ContentItemSchema.index({ 'buffer.channelId': 1, 'buffer.submissionId': 1 });

export const ContentItemModel =
  mongoose.models.ContentItem ||
  mongoose.model<ContentItemDocument>('ContentItem', ContentItemSchema);
