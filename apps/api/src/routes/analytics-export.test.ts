import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../middlewares/correlation.js';
import { analyticsRouter } from './analytics.router.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { ContentItemModel } from '../db/models/content-item.model.js';
import { ContentStatusEnum, ContentFormatEnum } from '@xgrowth/shared';

describe('Analytics Export & WoW Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/analytics', analyticsRouter);
  app.use(errorHandler);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Create current week item
    await ContentItemModel.create({
      status: ContentStatusEnum.PUBLISHED,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Current week post on distributed consensus.',
      topicPillar: 'Distributed Systems',
      createdAt: new Date(),
    });

    // Create previous week item
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    await ContentItemModel.create({
      status: ContentStatusEnum.PUBLISHED,
      format: ContentFormatEnum.EDUCATIONAL_TIP,
      text: 'Previous week tip on event loop performance.',
      topicPillar: 'Backend and full-stack development',
      createdAt: tenDaysAgo,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('exports weekly report in Markdown format with WoW section', async () => {
    const res = await request(app).get('/api/analytics/reports/report-abc-123/export?format=markdown');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/markdown');
    expect(res.header['content-disposition']).toContain('xgrowth-report-report-abc-123.md');
    expect(res.text).toContain('# Weekly X Content Report');
    expect(res.text).toContain('## Summary & Week-over-Week (WoW) Changes');
    expect(res.text).toContain('Posts:');
    expect(res.text).toContain('Total Likes:');
  });

  it('exports weekly report in JSON format with structured wowDeltas', async () => {
    const res = await request(app).get('/api/analytics/reports/report-xyz-789/export?format=json');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('application/json');
    expect(res.header['content-disposition']).toContain('xgrowth-report-report-xyz-789.json');

    const parsed = JSON.parse(res.text);
    expect(parsed.id).toBe('report-xyz-789');
    expect(parsed.wowDeltas).toBeDefined();
    expect(parsed.wowDeltas.posts).toBeDefined();
    expect(typeof parsed.wowDeltas.posts.current).toBe('number');
  });
});
