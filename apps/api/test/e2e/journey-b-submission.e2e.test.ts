import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../../src/middlewares/correlation.js';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { bufferRouter } from '../../src/routes/buffer.router.js';
import { ContentItemModel } from '../../src/db/models/content-item.model.js';
import { UserSettingsModel } from '../../src/db/models/user-settings.model.js';
import { ProviderSubmissionModel } from '../../src/db/models/provider-submission.model.js';
import { AuditEventModel } from '../../src/db/models/audit-event.model.js';
import { ContentStatusEnum, ContentFormatEnum, AuditActionEnum } from '@xgrowth/shared';
import { ContentHasher } from '../../src/services/content/hasher.js';

describe('Journey B E2E: Approved Item -> Buffer Submission -> Idempotent Persistence', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/buffer', bufferRouter);
  app.use(errorHandler);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Initialize settings with global pause = false so submissions can proceed
    await UserSettingsModel.create({
      globalPause: false,
      appName: 'XGrowth AI E2E',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('submits an approved item through the 4-gate safety filter to Buffer and prevents duplicate submission', async () => {
    const channelId = 'buffer-chan-x-001';
    const text = 'Clean architecture in TypeScript ensures long-term velocity and fearless refactoring.';

    // Compute cryptographic approval hash
    const hash = ContentHasher.computeApprovalHash({
      text,
      channelId,
    });

    // Create an approved content item
    const item = await ContentItemModel.create({
      status: ContentStatusEnum.APPROVED,
      format: ContentFormatEnum.SINGLE_POST,
      text,
      contentHash: hash,
      approval: {
        approvedBy: 'test-owner',
        approvedAt: new Date(),
        approvedHash: hash,
      },
      buffer: {
        channelId,
      },
    });

    // 1. Submit to Buffer
    const submitRes = await request(app)
      .post('/api/buffer/submit')
      .set('x-xgrowth-csrf', '1')
      .send({
        contentItemId: item._id.toString(),
        channelId,
        schedulingType: 'addToQueue',
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.status).toBe(ContentStatusEnum.SUBMITTED_TO_BUFFER);
    expect(submitRes.body.submissionId).toBeDefined();

    // 2. Verify ContentItem state in database
    const updatedItem = await ContentItemModel.findById(item._id);
    expect(updatedItem).not.toBeNull();
    expect(updatedItem?.status).toBe(ContentStatusEnum.SUBMITTED_TO_BUFFER);
    expect(updatedItem?.buffer?.submissionId).toBe(submitRes.body.submissionId);
    expect(updatedItem?.buffer?.channelId).toBe(channelId);
    expect(updatedItem?.buffer?.providerStatus).toBe('queued');

    // 3. Verify ProviderSubmissionModel record with idempotency key
    const submissionRecord = await ProviderSubmissionModel.findOne({
      contentItemId: item._id,
    });
    expect(submissionRecord).not.toBeNull();
    expect(submissionRecord?.status).toBe('queued');
    expect(submissionRecord?.providerPostId).toBe(submitRes.body.submissionId);
    expect(submissionRecord?.idempotencyKey).toBeDefined();

    // 4. Verify audit log entry
    const audit = await AuditEventModel.findOne({
      action: AuditActionEnum.BUFFER_SUBMISSION,
      targetId: item._id.toString(),
    });
    expect(audit).not.toBeNull();
    expect(audit?.actor).toBe('test-owner');

    // 5. Attempt immediate duplicate submission -> blocked by status gate
    const duplicateRes = await request(app)
      .post('/api/buffer/submit')
      .set('x-xgrowth-csrf', '1')
      .send({
        contentItemId: item._id.toString(),
        channelId,
      });

    expect(duplicateRes.status).toBe(500);
    expect(duplicateRes.body.message).toContain('must be \'approved\'');

    // 6. If status is forced back to approved with identical hash, blocked by Gate 4 idempotency check
    await ContentItemModel.findByIdAndUpdate(item._id, { status: ContentStatusEnum.APPROVED });
    const duplicateRes2 = await request(app)
      .post('/api/buffer/submit')
      .set('x-xgrowth-csrf', '1')
      .send({
        contentItemId: item._id.toString(),
        channelId,
      });

    expect(duplicateRes2.status).toBe(500);
    expect(duplicateRes2.body.message).toContain('Content has already been submitted');
  });
});
