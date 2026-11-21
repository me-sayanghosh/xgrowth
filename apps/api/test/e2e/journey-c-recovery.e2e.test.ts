import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ContentItemModel } from '../../src/db/models/content-item.model.js';
import { UserSettingsModel } from '../../src/db/models/user-settings.model.js';
import { ProviderSubmissionModel } from '../../src/db/models/provider-submission.model.js';
import { BufferSubmissionService } from '../../src/services/buffer/submission.service.js';
import { StatusReconciliationService } from '../../src/services/buffer/reconciliation.service.js';
import { BufferProvider, BufferPostInput, BufferPostResponse, BufferProviderError } from '../../src/services/buffer/buffer-provider.interface.js';
import { ContentStatusEnum, ContentFormatEnum, Result, ok, err } from '@xgrowth/shared';
import { ContentHasher } from '../../src/services/content/hasher.js';

class TimeoutSimulatingBufferProvider implements BufferProvider {
  public name = 'timeout-mock-provider';

  public async listChannels() {
    return ok([{ id: 'mock-channel-x', service: 'x', name: '@engineer_brand' }]);
  }

  public async submitPost(_input: BufferPostInput): Promise<Result<BufferPostResponse, BufferProviderError>> {
    // Simulate upstream HTTP 504 Gateway Timeout / socket hang up
    return err({
      code: 'REQUEST_TIMEOUT',
      message: 'Upstream Buffer gateway timed out waiting for response.',
      retryable: false,
    });
  }

  public async getPostStatus(_postId: string) {
    return ok({ status: 'queued' });
  }

  public async reconcileSubmission(submissionId: string, _channelId: string): Promise<Result<BufferPostResponse, BufferProviderError>> {
    // When queried during reconciliation, the post was actually received and queued
    return ok({
      success: true,
      id: submissionId || 'buf-post-recovered-999',
      providerStatus: 'queued',
      message: 'Post located in channel queue history during reconciliation.',
    });
  }
}

describe('Journey C E2E: Ambiguous Timeout -> Unknown State -> Safe Reconciliation', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    await UserSettingsModel.create({
      globalPause: false,
      appName: 'XGrowth AI E2E',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('handles provider timeout into unknown state and resolves via reconciliation without blind retry', async () => {
    const channelId = 'mock-channel-x';
    const text = 'Distributed transactions require explicit reconciliation mechanisms rather than blind retries.';

    const hash = ContentHasher.computeApprovalHash({
      text,
      channelId,
    });

    // 1. Create an approved item ready for submission
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

    const timeoutProvider = new TimeoutSimulatingBufferProvider();
    const submissionService = new BufferSubmissionService(timeoutProvider);

    // 2. Initial submission times out
    const submissionResult = await submissionService.submitApprovedItem({
      contentItemId: item._id.toString(),
      channelId,
    });

    expect(submissionResult.success).toBe(false);
    expect(submissionResult.status).toBe('unknown');
    expect(submissionResult.message).toContain('reconciliation required before retry');

    // 3. Verify item in database is quarantined in UNKNOWN state
    const timedOutItem = await ContentItemModel.findById(item._id);
    expect(timedOutItem?.status).toBe(ContentStatusEnum.UNKNOWN);
    expect(timedOutItem?.buffer?.errorCode).toBe('REQUEST_TIMEOUT');

    // 4. Verify ProviderSubmission record is marked unknown
    const submissionRecord = await ProviderSubmissionModel.findOne({
      contentItemId: item._id,
    });
    expect(submissionRecord).not.toBeNull();
    expect(submissionRecord?.status).toBe('unknown');
    expect(submissionRecord?.errorMessage).toContain('timed out');

    // 5. Verify blind retry is blocked by Gatekeeper (status is 'unknown', NOT 'approved')
    await expect(
      submissionService.submitApprovedItem({
        contentItemId: item._id.toString(),
        channelId,
      }),
    ).rejects.toThrow(/must be 'approved'/);

    // 6. Safely reconcile status via reconciliation service
    const reconciler = new StatusReconciliationService(timeoutProvider);
    const reconciledItem = await reconciler.reconcileItem(item._id.toString());

    // 7. Verify post is safely reconciled to queued
    expect(reconciledItem.status).toBe(ContentStatusEnum.QUEUED);
    expect(reconciledItem.buffer?.providerStatus).toBe('queued');

    // 8. Verify ProviderSubmission record updated to queued
    const reconciledSubmission = await ProviderSubmissionModel.findOne({
      contentItemId: item._id,
    });
    expect(reconciledSubmission?.status).toBe('queued');
  });
});
