import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SettingsService } from './settings.service.js';

describe('SettingsService', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('initializes default settings from yaml / defaults', async () => {
    const settings = await SettingsService.getSettings();
    expect(settings.appName).toBe('XGrowth AI');
    expect(settings.globalPause).toBe(true);
    expect(settings.brandPillars.length).toBeGreaterThan(0);
    expect(settings.preferredWindows).toEqual(['09:00', '13:00', '19:00']);
  });

  it('updates brand pillars and maxPostsPerDay', async () => {
    const updated = await SettingsService.updateSettings(
      {
        maxPostsPerDay: 5,
        brandPillars: ['TypeScript Deep Dives', 'AI Agent Architecture'],
      },
      'admin-user',
    );

    expect(updated.maxPostsPerDay).toBe(5);
    expect(updated.brandPillars).toEqual(['TypeScript Deep Dives', 'AI Agent Architecture']);

    const fetched = await SettingsService.getSettings();
    expect(fetched.maxPostsPerDay).toBe(5);
  });
});
