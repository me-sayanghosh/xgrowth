import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../middlewares/correlation.js';
import { analyticsRouter } from './analytics.router.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { ContentItemModel } from '../db/models/content-item.model.js';
import { MetricNormalizer } from '../services/analytics/normalizer.js';
import { ContentStatusEnum, ContentFormatEnum } from '@xgrowth/shared';

describe('Analytics & Reporting Router Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/analytics', analyticsRouter);
  app.use(errorHandler);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('verifies MetricNormalizer correctly attributes missing values without hallucination', () => {
    const raw = {
      likes: 15,
      reposts: 2,
      impressions: null, // unsupported metric
    };

    const normalized = MetricNormalizer.normalizeSet(raw, 'buffer_x_channel');
    expect(normalized.likes.available).toBe(true);
    expect(normalized.likes.value).toBe(15);
    expect(normalized.impressions.available).toBe(false);
    expect(normalized.impressions.value).toBeNull();
    expect(normalized.impressions.unavailableReason).toBe('Not available from connected provider');
  });

  it('GET /api/analytics/summary returns 30-day aggregate data', async () => {
    await ContentItemModel.create({
      status: ContentStatusEnum.PUBLISHED,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Analytics sample post',
      topicPillar: 'Backend and full-stack development',
    });

    const res = await request(app).get('/api/analytics/summary');
    expect(res.status).toBe(200);
    expect(res.body.periodDays).toBe(30);
    expect(Array.isArray(res.body.aggregates)).toBe(true);
  });

  it('POST /api/analytics/reports/generate creates a Markdown weekly report', async () => {
    const res = await request(app)
      .post('/api/analytics/reports/generate')
      .send();

    expect(res.status).toBe(201);
    expect(res.body.markdownReport).toContain('# Weekly X Content Report');
    expect(res.body.whatWorked.length).toBeGreaterThan(0);
    expect(res.body.nextExperiments.length).toBeGreaterThan(0);
  });
});
