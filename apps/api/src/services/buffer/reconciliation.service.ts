import { ContentItemModel, ContentItemDocument } from '../../db/models/content-item.model.js';
import { ProviderSubmissionModel } from '../../db/models/provider-submission.model.js';
import { BufferProvider } from './buffer-provider.interface.js';
import { createDefaultBufferProvider } from './buffer-provider.factory.js';
import { ContentStatusEnum } from '@xgrowth/shared';

export class StatusReconciliationService {
  private provider: BufferProvider;

  constructor(provider?: BufferProvider) {
    this.provider = provider || createDefaultBufferProvider();
  }

  public async reconcileItem(contentItemId: string): Promise<ContentItemDocument> {
    const item = await ContentItemModel.findById(contentItemId);
    if (!item) {
      throw new Error(`ContentItem not found: ${contentItemId}`);
    }

    const submission = await ProviderSubmissionModel.findOne({
      contentItemId: item._id,
    }).sort({ createdAt: -1 });

    if (!submission) {
      throw new Error(`No provider submission found for content item ${contentItemId}`);
    }

    const channelId = submission.channelId;
    const providerPostId = submission.providerPostId || submission.idempotencyKey;

    const res = await this.provider.reconcileSubmission(providerPostId, channelId);

    if (res.ok) {
      const response = res.value;
      if (response.providerStatus === 'queued' || response.providerStatus === 'scheduled') {
        item.status = ContentStatusEnum.QUEUED;
        submission.status = 'queued';
      } else if (response.providerStatus === 'published') {
        item.status = ContentStatusEnum.PUBLISHED;
        submission.status = 'published';
      } else if (response.providerStatus === 'failed') {
        item.status = ContentStatusEnum.FAILED;
        submission.status = 'failed';
      }

      if (!item.buffer) item.buffer = {};
      item.buffer.providerStatus = response.providerStatus;
      item.buffer.lastCheckedAt = new Date();

      await item.save();
      await submission.save();
    }

    return item;
  }
}
