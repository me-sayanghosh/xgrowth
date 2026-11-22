import { describe, it, beforeAll, afterAll, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../middlewares/correlation.js';
import { bufferRouter } from './buffer.router.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { ContentItemModel } from '../db/models/content-item.model.js';
import { UserSettingsModel } from '../db/models/user-settings.model.js';
import { BufferQuotaTracker } from '../services/buffer/rate-limiter.js';
import { ContentStatusEnum, ContentFormatEnum } from '@xgrowth/shared';
import { ContentHasher } from '../services/content/hasher.js';

describe('Buffer Export & Quota Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/buffer', bufferRouter);
  app.use(errorHandler);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    await UserSettingsModel.create({
      appName: 'XGrowth AI',
      globalPause: false, // unpaused for submission test
      operationMode: 'review_everything',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    BufferQuotaTracker.setUsageCount(0);
  });

  it('fetches buffer quota status', async () => {
    const res = await request(app).get('/api/buffer/quota');
    expect(res.status).toBe(200);
    expect(res.body.monthlyLimit).toBe(1000);
    expect(res.body.remaining).toBe(1000);
    expect(res.body.usageCount).toBe(0);
    expect(res.body.cycleResetDate).toBeDefined();
  });

  it('exports approved items to JSON and CSV formats', async () => {
    const text = 'Testing manual export of approved content items.';
    const hash = ContentHasher.computeApprovalHash({ text });

    await ContentItemModel.create({
      status: ContentStatusEnum.APPROVED,
      format: ContentFormatEnum.SINGLE_POST,
      text,
      topicPillar: 'Distributed Systems',
      contentHash: hash,
      approval: {
        approvedBy: 'owner',
        approvedAt: new Date(),
        approvedHash: hash,
      },
    });

    // 1. JSON Export
    const jsonRes = await request(app).get('/api/buffer/export?format=json');
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.header['content-type']).toContain('application/json');
    expect(jsonRes.header['content-disposition']).toContain('.json');

    const parsedJson = JSON.parse(jsonRes.text);
    expect(parsedJson.count).toBeGreaterThanOrEqual(1);
    expect(parsedJson.items[0].text).toBe(text);

    // 2. CSV Export
    const csvRes = await request(app).get('/api/buffer/export?format=csv');
    expect(csvRes.status).toBe(200);
    expect(csvRes.header['content-type']).toContain('text/csv');
    expect(csvRes.header['content-disposition']).toContain('.csv');
    expect(csvRes.text).toContain('ID,Text,Format,TopicPillar');
    expect(csvRes.text).toContain('Testing manual export');
  });

  it('blocks submission when monthly quota is exceeded', async () => {
    // Exhaust quota
    BufferQuotaTracker.setUsageCount(1000);

    const text = 'Item that should fail submission due to quota limit.';
    const hash = ContentHasher.computeApprovalHash({ text, channelId: 'chan-123' });
    const item = await ContentItemModel.create({
      status: ContentStatusEnum.APPROVED,
      format: ContentFormatEnum.SINGLE_POST,
      text,
      contentHash: hash,
      approval: {
        approvedBy: 'owner',
        approvedAt: new Date(),
        approvedHash: hash,
      },
    });

    const res = await request(app)
      .post('/api/buffer/submit')
      .set('x-xgrowth-csrf', '1')
      .send({
        contentItemId: item._id.toString(),
        channelId: 'chan-123',
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('Buffer monthly quota exceeded');
  });
});
