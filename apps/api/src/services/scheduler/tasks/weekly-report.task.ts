import { ContentItemModel } from '../../../db/models/content-item.model.js';
import { ContentStatusEnum } from '@xgrowth/shared';

export async function runWeeklyReportTask(): Promise<string> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const published = await ContentItemModel.find({
    status: ContentStatusEnum.PUBLISHED,
    updatedAt: { $gte: oneWeekAgo },
  });

  return `Weekly report generated. Analyzed ${published.length} posts published in the last 7 days.`;
}
