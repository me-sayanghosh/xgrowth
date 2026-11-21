import mongoose, { Schema, Document } from 'mongoose';

export interface UserSettingsDocument extends Document {
  appName: string;
  globalPause: boolean;
  operationMode: 'review_everything' | 'approved_category_auto_submit' | 'full_auto_submit';
  timezone: string;
  brandPillars: string[];
  voiceTraits: string[];
  voiceAvoid: string[];
  preferredWindows: string[];
  maxPostsPerDay: number;
  aiProvider: string;
  aiModel: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<UserSettingsDocument>(
  {
    appName: { type: String, default: 'XGrowth AI' },
    globalPause: { type: Boolean, default: true, required: true },
    operationMode: {
      type: String,
      enum: ['review_everything', 'approved_category_auto_submit', 'full_auto_submit'],
      default: 'review_everything',
    },
    timezone: { type: String, default: 'Asia/Kolkata' },
    brandPillars: { type: [String], default: [] },
    voiceTraits: { type: [String], default: [] },
    voiceAvoid: { type: [String], default: [] },
    preferredWindows: { type: [String], default: ['09:00', '13:00', '19:00'] },
    maxPostsPerDay: { type: Number, default: 3 },
    aiProvider: { type: String, default: 'gemini' },
    aiModel: { type: String, default: 'gemini-2.5-flash' },
  },
  {
    timestamps: true,
  },
);

export const UserSettingsModel =
  mongoose.models.UserSettings ||
  mongoose.model<UserSettingsDocument>('UserSettings', UserSettingsSchema);
