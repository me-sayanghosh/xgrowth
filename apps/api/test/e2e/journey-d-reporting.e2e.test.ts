import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../../src/middlewares/correlation.js';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { analyticsRouter } from '../../src/routes/analytics.router.js';
import { ContentItemModel } from '../../src/db/models/content-item.model.js';
import { AnalyticsSnapshotService } from '../../src/services/analytics/snapshot.service.js';
import { MetricNormalizer } from '../../src/services/analytics/normalizer.js';
import { ContentStatusEnum, ContentFormatEnum } from '@xgrowth/shared';

describe('Journey D E2E: Analytics Ingestion -> Attribution -> Weekly Synthesis', () => {
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

  it('ingests metrics with missing attribution and synthesizes an executive weekly Markdown report', async () => {
    // 1. Create published content items across distinct pillars
    const itemEng = await ContentItemModel.create({
      status: ContentStatusEnum.PUBLISHED,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Type-level programming in TypeScript enables zero-runtime validation guarantees.',
      topicPillar: 'Software engineering',
      buffer: {
        channelId: 'buffer-chan-x-001',
        submissionId: 'buf-eng-post-1',
        providerStatus: 'published',
      },
    });

    const itemArch = await ContentItemModel.create({
      status: ContentStatusEnum.PUBLISHED,
      format: ContentFormatEnum.EDUCATIONAL_TIP,
      text: 'Always decouple message queues from direct database writes to survive traffic spikes.',
      topicPillar: 'System Architecture',
      buffer: {
        channelId: 'buffer-chan-x-001',
        submissionId: 'buf-arch-post-2',
        providerStatus: 'published',
      },
    });

    // 2. Ingest raw performance metrics for itemEng (Buffer standard tier: likes available, impressions unavailable)
    const rawMetricsEng = {
      likes: 48,
      reposts: 12,
      replies: 5,
      impressions: null, // unsupported metric on standard tier
      clicks: 14,
    };

    const normalizedEng = MetricNormalizer.normalizeSet(rawMetricsEng, 'buffer_api');
    const snapshot = await AnalyticsSnapshotService.recordSnapshot({
      contentItemId: itemEng._id.toString(),
      channelId: 'buffer-chan-x-001',
      providerPostId: 'buf-eng-post-1',
      metrics: normalizedEng,
      rawPayload: rawMetricsEng,
    });

    expect(snapshot).toBeDefined();

    // Verify MetricNormalizer attribution invariant: zero hallucination of missing impressions
    const normalizedImpressions = snapshot.metrics['impressions'];
    expect(normalizedImpressions).toBeDefined();
    expect(normalizedImpressions.available).toBe(false);
    expect(normalizedImpressions.value).toBeNull();
    expect(normalizedImpressions.unavailableReason).toBe(MetricNormalizer.UNAVAILABLE_LABEL);

    const normalizedLikes = snapshot.metrics['likes'];
    expect(normalizedLikes).toBeDefined();
    expect(normalizedLikes.available).toBe(true);
    expect(normalizedLikes.value).toBe(48);

    // Record snapshot for itemArch
    const rawMetricsArch = { likes: 22, reposts: 4, impressions: null };
    const normalizedArch = MetricNormalizer.normalizeSet(rawMetricsArch, 'buffer_api');
    await AnalyticsSnapshotService.recordSnapshot({
      contentItemId: itemArch._id.toString(),
      channelId: 'buffer-chan-x-001',
      providerPostId: 'buf-arch-post-2',
      metrics: normalizedArch,
      rawPayload: rawMetricsArch,
    });

    // 3. Request 30-day analytics summary
    const summaryRes = await request(app).get('/api/analytics/summary');
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.periodDays).toBe(30);
    expect(Array.isArray(summaryRes.body.aggregates)).toBe(true);
    expect(summaryRes.body.aggregates.length).toBeGreaterThanOrEqual(1);

    // 4. Generate Weekly Report
    const now = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const reportRes = await request(app)
      .post('/api/analytics/reports/generate')
      .set('x-xgrowth-csrf', '1')
      .send({
        startDate: sevenDaysAgo.toISOString(),
        endDate: now.toISOString(),
      });

    expect(reportRes.status).toBe(201);
    const report = reportRes.body;
    expect(report.id).toBeDefined();
    expect(report.markdownReport).toContain('# Weekly X Content Report');
    expect(report.markdownReport).toContain('Software engineering');
    expect(report.markdownReport).toContain('Coverage / missing metrics');
    expect(report.whatWorked.length).toBeGreaterThan(0);
    expect(report.whatNeedsTesting.length).toBeGreaterThan(0);
    expect(report.nextExperiments.length).toBeGreaterThan(0);

    // 5. Query saved reports list
    const listRes = await request(app).get('/api/analytics/reports');
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThan(0);
    expect(listRes.body[0].id).toBeDefined();
    expect(listRes.body[0].markdownReport).toContain('# Weekly X Content Report');
  });
});
