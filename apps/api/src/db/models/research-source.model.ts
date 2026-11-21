import mongoose, { Schema, Document } from 'mongoose';

export interface ResearchSourceDocument extends Document {
  name: string;
  url: string;
  type: 'rss' | 'news' | 'url' | 'manual';
  category: string;
  enabled: boolean;
  credibilityScore: number;
  lastFetchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResearchSourceSchema = new Schema<ResearchSourceDocument>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true, unique: true },
    type: { type: String, enum: ['rss', 'news', 'url', 'manual'], default: 'rss' },
    category: { type: String, default: 'General' },
    enabled: { type: Boolean, default: true, index: true },
    credibilityScore: { type: Number, min: 1, max: 5, default: 4 },
    lastFetchedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

ResearchSourceSchema.index({ enabled: 1, type: 1 });

export const ResearchSourceModel =
  mongoose.models.ResearchSource ||
  mongoose.model<ResearchSourceDocument>('ResearchSource', ResearchSourceSchema);
