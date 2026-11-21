import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../middlewares/correlation.js';
import { contentGenerateRouter } from './content-generate.router.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { ContentStatusEnum } from '@xgrowth/shared';

describe('Content Generation Pipeline Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/content', contentGenerateRouter);
  app.use(errorHandler);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('POST /api/content/generate generates and persists drafts in needs_review state', async () => {
    const res = await request(app)
      .post('/api/content/generate')
      .send({
        topic: 'Node.js 24 Streams & Web Crypto',
        topicPillar: 'Backend and full-stack development',
        whyItMatters: 'Substantial throughput improvements for high-volume pipelines.',
        verifiedFacts: [
          'Stream pipelines now support native backpressure abort signals.',
          'Web Crypto API is 30% faster in v24.',
        ],
        format: 'single_post',
        variantCount: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);

    const firstItem = res.body.items[0];
    expect(firstItem.status).toBe(ContentStatusEnum.NEEDS_REVIEW);
    expect(firstItem.text).toContain('Node.js 24 Streams & Web Crypto');
    expect(firstItem.topicPillar).toBe('Backend and full-stack development');
    expect(firstItem._id).toBeDefined();
  });
});
