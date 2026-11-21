import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../../src/middlewares/correlation.js';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { contentItemRouter } from '../../src/routes/content-item.router.js';
import { contentGenerateRouter } from '../../src/routes/content-generate.router.js';
import { TopicModel } from '../../src/db/models/topic.model.js';

import { ApprovalRecordModel } from '../../src/db/models/approval-record.model.js';
import { AuditEventModel } from '../../src/db/models/audit-event.model.js';
import { ContentStatusEnum, ContentFormatEnum, AuditActionEnum } from '@xgrowth/shared';
import { ContentHasher } from '../../src/services/content/hasher.js';

describe('Journey A E2E: Topic -> Draft -> Edit -> Approve -> Hash Invariant', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/content', contentGenerateRouter);
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

  it('completes the full lifecycle from topic research to cryptographic approval', async () => {
    // 1. Create a researched topic candidate
    const topic = await TopicModel.create({
      title: 'Architecting Resilient Monorepos in TypeScript',
      sourceName: 'Engineering Blog',
      sourceUrl: 'https://engineering.example.com/monorepo-best-practices',
      summary: 'Exploring strict boundary isolation, shared packages, and unified CI caching.',
      topicPillar: 'Software engineering',
      freshnessScore: 5,
      credibilityScore: 5,
      relevanceScore: 5,
      status: 'discovered',
    });
    expect(topic._id).toBeDefined();

    // 2. Generate content drafts from the topic
    const genRes = await request(app)
      .post('/api/content/generate')
      .set('x-xgrowth-csrf', '1')
      .send({
        topic: topic.title,
        verifiedFacts: ['Strict boundary isolation prevents architectural drift in high-velocity teams.'],
        format: ContentFormatEnum.SINGLE_POST,
        topicPillar: 'Software engineering',
        sourceUrls: [topic.sourceUrl],
      });

    expect(genRes.status).toBe(201);
    expect(genRes.body.success).toBe(true);
    expect(genRes.body.count).toBeGreaterThan(0);

    const generatedDraft = genRes.body.items[0];
    const draftId = generatedDraft._id;
    expect(generatedDraft.status).toBe(ContentStatusEnum.NEEDS_REVIEW);
    expect(generatedDraft.text).toBeDefined();

    // 3. Owner edits the draft to personalize voice and nuance
    const updatedText =
      'Monorepos succeed when strict boundaries prevent circular coupling. Treat internal packages as external contracts.';
    const editRes = await request(app)
      .patch(`/api/content/items/${draftId}`)
      .set('x-xgrowth-csrf', '1')
      .send({
        text: updatedText,
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.text).toBe(updatedText);
    expect(editRes.body.status).toBe(ContentStatusEnum.NEEDS_REVIEW);

    // 4. Owner approves the edited draft with target Buffer X channel
    const approveRes = await request(app)
      .post(`/api/content/items/${draftId}/approve`)
      .set('x-xgrowth-csrf', '1')
      .send({
        channelId: 'buffer-chan-x-eng-01',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);

    const approvedItem = approveRes.body.item;
    expect(approvedItem.status).toBe(ContentStatusEnum.APPROVED);
    expect(approvedItem.approval).toBeDefined();
    expect(approvedItem.approval.approvedBy).toBe('test-owner');
    expect(approvedItem.approval.approvedHash).toBeDefined();

    // Verify hash matches canonical SHA-256 calculation
    const expectedHash = ContentHasher.computeApprovalHash({
      text: updatedText,
      threadParts: approvedItem.threadParts || [],
      channelId: 'buffer-chan-x-eng-01',
    });
    expect(approvedItem.approval.approvedHash).toBe(expectedHash);
    expect(approvedItem.contentHash).toBe(expectedHash);

    // 5. Verify immutable append-only record was persisted
    const record = await ApprovalRecordModel.findOne({
      contentItemId: draftId,
    });
    expect(record).not.toBeNull();
    expect(record?.approvedHash).toBe(expectedHash);
    expect(record?.snapshotText).toBe(updatedText);
    expect(record?.channelId).toBe('buffer-chan-x-eng-01');

    // 6. Verify audit event was logged
    const audit = await AuditEventModel.findOne({
      action: AuditActionEnum.APPROVAL_GRANTED,
      targetId: draftId,
    });
    expect(audit).not.toBeNull();
    expect(audit?.actor).toBe('test-owner');

    // 7. Verify post-approval edit invalidation invariant
    const postApprovalEditRes = await request(app)
      .patch(`/api/content/items/${draftId}`)
      .set('x-xgrowth-csrf', '1')
      .send({
        text: 'Post-approval edit that must revoke approval status!',
      });

    expect(postApprovalEditRes.status).toBe(200);
    expect(postApprovalEditRes.body.status).toBe(ContentStatusEnum.NEEDS_REVIEW);
    expect(postApprovalEditRes.body.approval).toBeUndefined();

    // Verify invalidation audit log recorded
    const invalidationAudit = await AuditEventModel.findOne({
      action: AuditActionEnum.APPROVAL_INVALIDATED,
      targetId: draftId,
    });
    expect(invalidationAudit).not.toBeNull();
  });
});
