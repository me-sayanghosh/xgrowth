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

describe('Content Item Batch Operations Router Test', () => {
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

  it('batch approves multiple items and generates cryptographic hashes', async () => {
    const item1 = await ContentItemModel.create({
      status: ContentStatusEnum.NEEDS_REVIEW,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Batch draft item 1 for testing approval workflow.',
      topicPillar: 'Distributed Systems',
    });

    const item2 = await ContentItemModel.create({
      status: ContentStatusEnum.NEEDS_REVIEW,
      format: ContentFormatEnum.EDUCATIONAL_TIP,
      text: 'Batch draft item 2 for testing approval workflow.',
      topicPillar: 'Software Architecture',
    });

    const res = await request(app)
      .post('/api/content/items/batch-approve')
      .set('x-xgrowth-csrf', '1')
      .send({
        ids: [item1._id.toString(), item2._id.toString()],
        channelId: 'chan-x-test',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);

    const updated1 = await ContentItemModel.findById(item1._id);
    const updated2 = await ContentItemModel.findById(item2._id);

    expect(updated1?.status).toBe(ContentStatusEnum.APPROVED);
    expect(updated1?.contentHash).toBeDefined();
    expect(updated2?.status).toBe(ContentStatusEnum.APPROVED);
    expect(updated2?.contentHash).toBeDefined();

    const records = await ApprovalRecordModel.find({
      contentItemId: { $in: [item1._id, item2._id] },
    });
    expect(records.length).toBe(2);
  });

  it('batch rejects multiple items and transitions status to rejected', async () => {
    const item3 = await ContentItemModel.create({
      status: ContentStatusEnum.NEEDS_REVIEW,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Item to be batch rejected.',
      topicPillar: 'Testing',
    });

    const res = await request(app)
      .post('/api/content/items/batch-reject')
      .set('x-xgrowth-csrf', '1')
      .send({
        ids: [item3._id.toString()],
        reason: 'Low quality angle',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);

    const updated3 = await ContentItemModel.findById(item3._id);
    expect(updated3?.status).toBe(ContentStatusEnum.REJECTED);
  });
});
