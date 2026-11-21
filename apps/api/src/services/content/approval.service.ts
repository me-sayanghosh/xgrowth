import { ContentItemModel, ContentItemDocument } from '../../db/models/content-item.model.js';
import { ApprovalRecordModel } from '../../db/models/approval-record.model.js';
import { ContentHasher } from './hasher.js';
import { ContentStateMachine } from './state-machine.js';
import { ContentStatusEnum, AuditActionEnum } from '@xgrowth/shared';
import { AuditService } from '../audit.service.js';

export interface ApproveDraftInput {
  contentItemId: string;
  approvedBy: string;
  channelId?: string;
}

export class ApprovalService {
  public static async approveDraft(input: ApproveDraftInput): Promise<ContentItemDocument> {
    const item = await ContentItemModel.findById(input.contentItemId);
    if (!item) {
      throw new Error(`ContentItem not found: ${input.contentItemId}`);
    }

    ContentStateMachine.assertTransition(item.status, ContentStatusEnum.APPROVED);

    const approvedHash = ContentHasher.computeApprovalHash({
      text: item.text,
      threadParts: item.threadParts,
      channelId: input.channelId,
      mediaUrls: [],
    });

    const now = new Date();

    // 1. Create immutable approval record
    await ApprovalRecordModel.create({
      contentItemId: item._id,
      approvedBy: input.approvedBy,
      approvedAt: now,
      approvedHash,
      snapshotText: item.text,
      snapshotThreadParts: item.threadParts,
      channelId: input.channelId,
    });

    // 2. Update ContentItem
    item.status = ContentStatusEnum.APPROVED;
    item.contentHash = approvedHash;
    item.approval = {
      approvedBy: input.approvedBy,
      approvedAt: now,
      approvedHash,
    };
    if (input.channelId) {
      if (!item.buffer) item.buffer = {};
      item.buffer.channelId = input.channelId;
    }

    await item.save();

    // 3. Audit event
    await AuditService.recordEvent({
      action: AuditActionEnum.APPROVAL_GRANTED,
      actor: input.approvedBy,
      targetId: item._id.toString(),
      targetType: 'ContentItem',
      metadata: { approvedHash, channelId: input.channelId },
    });

    return item;
  }
}
