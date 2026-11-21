import { ContentItemModel } from '../../../db/models/content-item.model.js';
import { StatusReconciliationService } from '../../buffer/reconciliation.service.js';
import { ContentStatusEnum } from '@xgrowth/shared';

export async function runBufferReconciliationTask(): Promise<string> {
  const pendingItems = await ContentItemModel.find({
    status: {
      $in: [ContentStatusEnum.SUBMITTED_TO_BUFFER, ContentStatusEnum.UNKNOWN],
    },
  }).limit(10); // Throttle batch size to protect monthly rate limits

  if (pendingItems.length === 0) {
    return 'No pending or ambiguous submissions to reconcile.';
  }

  const reconciler = new StatusReconciliationService();
  let reconciledCount = 0;

  for (const item of pendingItems) {
    try {
      await reconciler.reconcileItem(item._id.toString());
      reconciledCount++;
    } catch {
      // Keep going for remaining items
    }
  }

  return `Reconciled ${reconciledCount} out of ${pendingItems.length} checked items.`;
}
