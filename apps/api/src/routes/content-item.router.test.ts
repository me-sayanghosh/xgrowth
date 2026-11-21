import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../middlewares/correlation.js';
import { contentItemRouter } from './content-item.router.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { ContentItemModel } from '../db/models/content-item.model.js';
import { ApprovalRecordModel } from '../db/models/approval-record.model.js';
import { ContentStatusEnum, ContentFormatEnum } from '@xgrowth/shared';

describe('Content Item & Approval Lifecycle Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/content', contentItemRouter);
  app.use(errorHandler);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('approves a draft, sets status to approved, and stores cryptographic hash', async () => {
    const item = await ContentItemModel.create({
      status: ContentStatusEnum.NEEDS_REVIEW,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Production post ready for approval verification.',
      topicPillar: 'Software engineering',
    });

    const res = await request(app)
      .post(`/api/content/items/${item._id}/approve`)
      .send({ channelId: 'chan-x-test' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.item.status).toBe(ContentStatusEnum.APPROVED);
    expect(res.body.item.contentHash).toBeDefined();
    expect(res.body.item.approval.approvedHash).toBe(res.body.item.contentHash);

    // Verify append-only record created
    const record = await ApprovalRecordModel.findOne({ contentItemId: item._id });
    expect(record).toBeDefined();
    expect(record?.approvedHash).toBe(res.body.item.contentHash);
  });

  it('invalidates approval and resets status to needs_review when text is modified after approval', async () => {
    const item = await ContentItemModel.create({
      status: ContentStatusEnum.NEEDS_REVIEW,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Approved text before edit.',
    });

    // Approve it first
    await request(app)
      .post(`/api/content/items/${item._id}/approve`)
      .send({ channelId: 'chan-x-test' });

    // Now edit the text post-approval
    const patchRes = await request(app)
      .patch(`/api/content/items/${item._id}`)
      .send({ text: 'Mutated text after approval!' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe(ContentStatusEnum.NEEDS_REVIEW);
    expect(patchRes.body.approval).toBeUndefined();
    expect(patchRes.body.contentHash).toBeUndefined();
  });

  it('rejects draft transition when requested', async () => {
    const item = await ContentItemModel.create({
      status: ContentStatusEnum.NEEDS_REVIEW,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Low quality idea to reject.',
    });

    const res = await request(app)
      .post(`/api/content/items/${item._id}/reject`)
      .send({ reason: 'Off-topic or poor hook' });

    expect(res.status).toBe(200);
    expect(res.body.item.status).toBe(ContentStatusEnum.REJECTED);
  });
});
