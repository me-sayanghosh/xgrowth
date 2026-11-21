import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserSettingsModel } from './user-settings.model.js';
import { ContentItemModel } from './content-item.model.js';
import { ProviderSubmissionModel } from './provider-submission.model.js';
import { ContentStatusEnum, ContentFormatEnum } from '@xgrowth/shared';

describe('MongoDB Models Integration Test', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('creates and retrieves default user settings with global_pause = true', async () => {
    const settings = await UserSettingsModel.create({
      appName: 'XGrowth AI',
      globalPause: true,
      brandPillars: ['Engineering', 'AI'],
    });

    expect(settings._id).toBeDefined();
    expect(settings.globalPause).toBe(true);

    const found = await UserSettingsModel.findById(settings._id);
    expect(found?.appName).toBe('XGrowth AI');
  });

  it('enforces required fields on ContentItemModel', async () => {
    const item = await ContentItemModel.create({
      status: ContentStatusEnum.NEEDS_REVIEW,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Sample integration test post for XGrowth',
      topicPillar: 'Engineering',
    });

    expect(item._id).toBeDefined();
    expect(item.status).toBe(ContentStatusEnum.NEEDS_REVIEW);
    expect(item.createdAt).toBeDefined();
  });

  it('enforces unique index on ProviderSubmissionModel idempotencyKey', async () => {
    const contentItem = await ContentItemModel.create({
      status: ContentStatusEnum.APPROVED,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Approved item for idempotency test',
    });

    await ProviderSubmissionModel.create({
      contentItemId: contentItem._id,
      channelId: 'chan-123',
      idempotencyKey: 'deterministic-idempotency-key-001',
      requestPayload: { text: 'test' },
    });

    // Second attempt with identical idempotencyKey must throw duplicate key error
    await expect(
      ProviderSubmissionModel.create({
        contentItemId: contentItem._id,
        channelId: 'chan-123',
        idempotencyKey: 'deterministic-idempotency-key-001',
        requestPayload: { text: 'test' },
      }),
    ).rejects.toThrow();
  });
});
