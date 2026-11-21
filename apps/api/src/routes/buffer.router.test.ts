import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../middlewares/correlation.js';
import { bufferRouter } from './buffer.router.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { ContentItemModel } from '../db/models/content-item.model.js';
import { EmergencyPauseService } from '../services/emergency-pause.service.js';
import { ApprovalService } from '../services/content/approval.service.js';
import { ContentStatusEnum, ContentFormatEnum } from '@xgrowth/shared';

describe('Buffer Router & Guardrails Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/buffer', bufferRouter);
  app.use(errorHandler);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('GET /api/buffer/channels returns list of connected X channels', async () => {
    const res = await request(app).get('/api/buffer/channels');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].service).toBe('x');
  });

  it('blocks submission when global emergency pause is active', async () => {
    await EmergencyPauseService.setPaused(true);

    const item = await ContentItemModel.create({
      status: ContentStatusEnum.NEEDS_REVIEW,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Test post for pause verification',
    });

    // Approve item
    await ApprovalService.approveDraft({
      contentItemId: item._id.toString(),
      approvedBy: 'owner',
      channelId: 'mock-channel-x-01',
    });

    const res = await request(app)
      .post('/api/buffer/submit')
      .send({
        contentItemId: item._id.toString(),
        channelId: 'mock-channel-x-01',
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('Global emergency pause is active');
  });

  it('allows submission when pause is disabled and item is approved, then blocks duplicate retry', async () => {
    await EmergencyPauseService.setPaused(false);

    const item = await ContentItemModel.create({
      status: ContentStatusEnum.NEEDS_REVIEW,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Live approved post ready for queue',
    });

    await ApprovalService.approveDraft({
      contentItemId: item._id.toString(),
      approvedBy: 'owner',
      channelId: 'mock-channel-x-01',
    });

    const res = await request(app)
      .post('/api/buffer/submit')
      .send({
        contentItemId: item._id.toString(),
        channelId: 'mock-channel-x-01',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('submitted_to_buffer');

    // Duplicate submission attempt is blocked because status is now submitted_to_buffer
    const dupRes = await request(app)
      .post('/api/buffer/submit')
      .send({
        contentItemId: item._id.toString(),
        channelId: 'mock-channel-x-01',
      });

    expect(dupRes.status).toBe(500);
    expect(dupRes.body.message).toContain('must be \'approved\'');

    // If status is forced back to approved with same hash, idempotency check blocks it
    item.status = ContentStatusEnum.APPROVED;
    await item.save();

    const dupRes2 = await request(app)
      .post('/api/buffer/submit')
      .send({
        contentItemId: item._id.toString(),
        channelId: 'mock-channel-x-01',
      });

    expect(dupRes2.status).toBe(500);
    expect(dupRes2.body.message).toContain('Content has already been submitted');
  });
});
