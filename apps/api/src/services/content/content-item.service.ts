import { ContentItemModel, ContentItemDocument } from '../../db/models/content-item.model.js';
import { ContentStatusEnum, AuditActionEnum } from '@xgrowth/shared';
import { AuditService } from '../audit.service.js';

export interface UpdateContentItemInput {
  text?: string;
  threadParts?: string[];
  topicPillar?: string;
  audience?: string;
  channelId?: string;
}

export class ContentItemService {
  public static async updateItem(
    id: string,
    updates: UpdateContentItemInput,
    actor = 'owner',
  ): Promise<ContentItemDocument> {
    const item = await ContentItemModel.findById(id);
    if (!item) {
      throw new Error(`ContentItem not found: ${id}`);
    }

    const isTextOrChannelChanging =
      (updates.text !== undefined && updates.text !== item.text) ||
      (updates.threadParts !== undefined && JSON.stringify(updates.threadParts) !== JSON.stringify(item.threadParts)) ||
      (updates.channelId !== undefined && updates.channelId !== item.buffer?.channelId);

    // If item was approved and content is modified, invalidate approval!
    if (item.status === ContentStatusEnum.APPROVED && isTextOrChannelChanging) {
      const priorApprovedHash = item.approval?.approvedHash;

      // Invalidate and reset to needs_review
      item.status = ContentStatusEnum.NEEDS_REVIEW;
      item.approval = undefined;
      item.contentHash = undefined;

      await AuditService.recordEvent({
        action: AuditActionEnum.APPROVAL_INVALIDATED,
        actor,
        targetId: item._id.toString(),
        targetType: 'ContentItem',
        metadata: {
          reason: 'Post-approval edit invalidated previous approval',
          priorApprovedHash,
        },
      });
    }

    if (updates.text !== undefined) item.text = updates.text;
    if (updates.threadParts !== undefined) item.threadParts = updates.threadParts;
    if (updates.topicPillar !== undefined) item.topicPillar = updates.topicPillar;
    if (updates.audience !== undefined) item.audience = updates.audience;
    if (updates.channelId !== undefined) {
      if (!item.buffer) item.buffer = {};
      item.buffer.channelId = updates.channelId;
    }

    await item.save();

    await AuditService.recordEvent({
      action: AuditActionEnum.CONTENT_EDITED,
      actor,
      targetId: item._id.toString(),
      targetType: 'ContentItem',
      metadata: { status: item.status },
    });

    return item;
  }
}
