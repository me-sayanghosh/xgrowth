import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { matchesCron } from './cron-evaluator.js';
import { AutoPublisherService } from './tasks/auto-publish.task.js';
import { UserSettingsModel } from '../../db/models/user-settings.model.js';
import { ContentItemModel } from '../../db/models/content-item.model.js';
import { ApprovalService } from '../content/approval.service.js';
import { MockBufferProvider } from '../buffer/mock-buffer.provider.js';
import { BufferQuotaTracker } from '../buffer/rate-limiter.js';
import { ContentStatusEnum, ContentFormatEnum } from '@xgrowth/shared';

describe('Cron Evaluator & AutoPublisherService Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await UserSettingsModel.deleteMany({});
    await ContentItemModel.deleteMany({});
    BufferQuotaTracker.setUsageCount(0);
  });

  describe('matchesCron', () => {
    it('evaluates step, exact, and weekday cron fields in UTC', () => {
      const mondayTenUtc = new Date('2026-11-23T10:00:00.000Z'); // Monday=1
      expect(matchesCron('0 10 * * 1', mondayTenUtc)).toBe(true);
      expect(matchesCron('0 11 * * 1', mondayTenUtc)).toBe(false);
      expect(matchesCron('*/5 * * * *', mondayTenUtc)).toBe(true);
      expect(matchesCron('0 */4 * * *', new Date('2026-11-23T08:00:00.000Z'))).toBe(true);
      expect(matchesCron('0 */4 * * *', new Date('2026-11-23T09:00:00.000Z'))).toBe(false);
    });
  });

  describe('AutoPublisherService', () => {
    it('blocks all auto-publishing when globalPause is active', async () => {
      await UserSettingsModel.create({
        globalPause: true,
        operationMode: 'full_auto_submit',
        brandPillars: ['Software engineering'],
      });

      const res = await AutoPublisherService.run(new MockBufferProvider());
      expect(res.submitted).toBe(0);
      expect(res.skippedReason).toBe('global_pause_active');
    });

    it('never submits unapproved drafts even in full_auto_submit mode', async () => {
      await UserSettingsModel.create({
        globalPause: false,
        operationMode: 'full_auto_submit',
        brandPillars: ['Software engineering'],
      });

      await ContentItemModel.create({
        status: ContentStatusEnum.NEEDS_REVIEW,
        format: ContentFormatEnum.SINGLE_POST,
        text: 'Unapproved draft should never be auto-published.',
        topicPillar: 'Software engineering',
      });

      const res = await AutoPublisherService.run(new MockBufferProvider());
      expect(res.submitted).toBe(0);
      expect(res.skippedReason).toBe('no_due_approved_items');
    });

    it('submits approved items in approved_category_auto_submit mode and respects daily cap', async () => {
      await UserSettingsModel.create({
        globalPause: false,
        operationMode: 'approved_category_auto_submit',
        brandPillars: ['Distributed Systems'],
        maxPostsPerDay: 1,
      });

      const item1 = await ContentItemModel.create({
        status: ContentStatusEnum.NEEDS_REVIEW,
        format: ContentFormatEnum.SINGLE_POST,
        text: 'Approved post 1 in Distributed Systems.',
        topicPillar: 'Distributed Systems',
      });
      await ApprovalService.approveDraft({
        contentItemId: item1._id.toString(),
        approvedBy: 'owner',
        channelId: 'mock-channel-x-01',
      });

      const item2 = await ContentItemModel.create({
        status: ContentStatusEnum.NEEDS_REVIEW,
        format: ContentFormatEnum.SINGLE_POST,
        text: 'Approved post 2 should be capped by maxPostsPerDay=1.',
        topicPillar: 'Distributed Systems',
      });
      await ApprovalService.approveDraft({
        contentItemId: item2._id.toString(),
        approvedBy: 'owner',
        channelId: 'mock-channel-x-01',
      });

      const res = await AutoPublisherService.run(new MockBufferProvider());
      expect(res.submitted).toBe(1);
      expect(res.errors).toHaveLength(0);

      const updated1 = await ContentItemModel.findById(item1._id);
      const updated2 = await ContentItemModel.findById(item2._id);
      expect(updated1?.status).toBe(ContentStatusEnum.SUBMITTED_TO_BUFFER);
      expect(updated2?.status).toBe(ContentStatusEnum.APPROVED);
    });
  });
});
