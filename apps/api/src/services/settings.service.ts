import { UserSettingsModel, UserSettingsDocument } from '../db/models/user-settings.model.js';
import { loadSettingsFromYaml, AppSettings } from '@xgrowth/config';
import { AuditService } from './audit.service.js';
import { AuditActionEnum } from '@xgrowth/shared';

export class SettingsService {
  public static async getSettings(): Promise<UserSettingsDocument> {
    const settings = await UserSettingsModel.findOne();
    if (!settings) {
      return this.seedDefaultSettings();
    }
    return settings;
  }

  public static async seedDefaultSettings(): Promise<UserSettingsDocument> {
    let yamlDefaults: AppSettings | null = null;
    try {
      yamlDefaults = loadSettingsFromYaml();
    } catch {
      // Fallback defaults if yaml missing
    }

    const initial = await UserSettingsModel.create({
      appName: yamlDefaults?.app.name ?? 'XGrowth AI',
      globalPause: yamlDefaults?.operation.global_pause ?? true,
      operationMode: yamlDefaults?.operation.mode ?? 'review_everything',
      timezone: yamlDefaults?.app.timezone ?? 'Asia/Kolkata',
      brandPillars: yamlDefaults?.brand.pillars ?? [
        'Software engineering',
        'React, Node.js, JavaScript and TypeScript',
        'AI tools and practical AI engineering',
        'Building in public',
      ],
      voiceTraits: yamlDefaults?.brand.voice.traits ?? ['clear', 'practical', 'curious', 'specific', 'human'],
      voiceAvoid: yamlDefaults?.brand.voice.avoid ?? ['generic motivational posts', 'fake controversy', 'engagement bait'],
      preferredWindows: yamlDefaults?.publishing.preferred_windows ?? ['09:00', '13:00', '19:00'],
      maxPostsPerDay: yamlDefaults?.operation.max_posts_per_day ?? 3,
      language: (yamlDefaults?.app.default_language as 'en' | 'bn' | 'mixed') ?? 'en',
      aiProvider: yamlDefaults?.ai.provider ?? 'gemini',
      aiModel: yamlDefaults?.ai.model ?? 'gemini-2.5-flash',
    });

    return initial;
  }

  public static async updateSettings(
    updates: Partial<UserSettingsDocument>,
    actor = 'owner',
  ): Promise<UserSettingsDocument> {
    const updated = await UserSettingsModel.findOneAndUpdate({}, updates, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    await AuditService.recordEvent({
      action: AuditActionEnum.SETTINGS_UPDATED,
      actor,
      metadata: { updatedFields: Object.keys(updates) },
    });

    return updated;
  }
}
