import { ContentItemModel } from '../../db/models/content-item.model.js';
import { ProviderSubmissionModel } from '../../db/models/provider-submission.model.js';
import { BufferProvider } from './buffer-provider.interface.js';
import { createDefaultBufferProvider } from './buffer-provider.factory.js';
import { SubmissionGatekeeper } from './submission-gatekeeper.js';
import { BufferQuotaTracker } from './rate-limiter.js';
import { ContentStatusEnum, AuditActionEnum } from '@xgrowth/shared';
import { AuditService } from '../audit.service.js';

export interface SubmitPostOptions {
  contentItemId: string;
  channelId: string;
  schedulingType?: 'addToQueue' | 'scheduled' | 'publishNow';
  dueAt?: string;
  actor?: string;
}

export class BufferSubmissionService {
  private provider: BufferProvider;

  constructor(provider?: BufferProvider) {
    if (provider) {
      this.provider = provider;
    } else {
      this.provider = createDefaultBufferProvider();
    }
  }

  public async submitApprovedItem(
    options: SubmitPostOptions,
  ): Promise<{ success: boolean; status: string; message: string; submissionId?: string }> {
    const actor = options.actor || 'owner';
    const item = await ContentItemModel.findById(options.contentItemId);
    if (!item) {
      throw new Error(`ContentItem not found: ${options.contentItemId}`);
    }

    // 1. Run Pre-submission Gatekeeper
    if (BufferQuotaTracker.getRemainingQuota() <= 0) {
      throw new Error('Buffer monthly quota exceeded (1,000 requests limit). Submissions blocked.');
    }

    const gateCheck = await SubmissionGatekeeper.verify(item, options.channelId);
    if (!gateCheck.allowed || !gateCheck.idempotencyKey) {
      throw new Error(gateCheck.reason || 'Submission gate check failed.');
    }

    const idempotencyKey = gateCheck.idempotencyKey;

    // 2. Create pending submission record
    const submissionRecord = await ProviderSubmissionModel.create({
      contentItemId: item._id,
      channelId: options.channelId,
      idempotencyKey,
      status: 'pending',
      requestPayload: {
        text: item.text,
        threadParts: item.threadParts,
        schedulingType: options.schedulingType || 'addToQueue',
      },
    });

    // 3. Dispatch to Buffer Provider
    BufferQuotaTracker.recordApiCall();
    const result = await this.provider.submitPost({
      channelId: options.channelId,
      text: item.text,
      schedulingType: options.schedulingType || 'addToQueue',
      dueAt: options.dueAt,
      threadParts: item.threadParts,
      idempotencyKey,
    });

    if (result.ok) {
      const postResponse = result.value;

      submissionRecord.status = 'queued';
      submissionRecord.providerPostId = postResponse.id;
      submissionRecord.responsePayload = postResponse as unknown as Record<string, unknown>;
      await submissionRecord.save();

      // Transition ContentItem
      item.status =
        postResponse.providerStatus === 'published'
          ? ContentStatusEnum.PUBLISHED
          : ContentStatusEnum.SUBMITTED_TO_BUFFER;
      if (postResponse.scheduledAt) {
        item.scheduledFor = new Date(postResponse.scheduledAt);
      } else if (options.dueAt) {
        item.scheduledFor = new Date(options.dueAt);
      }
      item.buffer = {
        channelId: options.channelId,
        submissionId: postResponse.id,
        providerStatus: postResponse.providerStatus,
        submittedAt: new Date(),
        lastCheckedAt: new Date(),
      };
      await item.save();

      await AuditService.recordEvent({
        action: AuditActionEnum.BUFFER_SUBMISSION,
        actor,
        targetId: item._id.toString(),
        targetType: 'ContentItem',
        metadata: {
          submissionRecordId: submissionRecord._id.toString(),
          providerPostId: postResponse.id,
          status: 'queued',
        },
      });

      return {
        success: true,
        status: 'submitted_to_buffer',
        message: postResponse.message || 'Post submitted to Buffer queue.',
        submissionId: postResponse.id,
      };
    } else {
      const err = result.error;

      // Handle ambiguous timeouts / network failures -> transition to unknown
      if (err.code === 'REQUEST_TIMEOUT' || err.code.includes('TIMEOUT')) {
        submissionRecord.status = 'unknown';
        submissionRecord.errorMessage = err.message;
        await submissionRecord.save();

        item.status = ContentStatusEnum.UNKNOWN;
        if (!item.buffer) item.buffer = {};
        item.buffer.errorCode = err.code;
        item.buffer.lastCheckedAt = new Date();
        await item.save();

        return {
          success: false,
          status: 'unknown',
          message: 'Submission request timed out. Status is ambiguous; reconciliation required before retry.',
        };
      }

      // Definite failure
      submissionRecord.status = 'failed';
      submissionRecord.errorCode = err.code;
      submissionRecord.errorMessage = err.message;
      await submissionRecord.save();

      item.status = ContentStatusEnum.FAILED;
      if (!item.buffer) item.buffer = {};
      item.buffer.errorCode = err.code;
      await item.save();

      return {
        success: false,
        status: 'failed',
        message: err.message,
      };
    }
  }
}
