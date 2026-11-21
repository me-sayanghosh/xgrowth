import mongoose, { Schema, Document } from 'mongoose';

export interface TopicDocument extends Document {
  title: string;
  sourceUrl: string;
  sourceName: string;
  excerpt: string;
  topicPillar: string;
  freshnessScore: number;
  credibilityScore: number;
  relevanceScore: number;
  status: 'discovered' | 'briefed' | 'archived';
  publishedAt?: Date;
  discoveredAt: Date;
  briefId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TopicSchema = new Schema<TopicDocument>(
  {
    title: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    sourceName: { type: String, required: true },
    excerpt: { type: String, default: '' },
    topicPillar: { type: String, default: 'General' },
    freshnessScore: { type: Number, min: 1, max: 5, default: 3 },
    credibilityScore: { type: Number, min: 1, max: 5, default: 3 },
    relevanceScore: { type: Number, min: 1, max: 5, default: 3 },
    status: {
      type: String,
      enum: ['discovered', 'briefed', 'archived'],
      default: 'discovered',
      index: true,
    },
    publishedAt: { type: Date },
    discoveredAt: { type: Date, default: Date.now },
    briefId: { type: String },
  },
  {
    timestamps: true,
  },
);

TopicSchema.index({ status: 1, createdAt: -1 });

export const TopicModel: mongoose.Model<TopicDocument> =
  (mongoose.models.Topic as mongoose.Model<TopicDocument>) ||
  mongoose.model<TopicDocument>('Topic', TopicSchema);
