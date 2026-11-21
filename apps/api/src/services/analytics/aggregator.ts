import { ContentItemModel } from '../../db/models/content-item.model.js';
import { AnalyticsSnapshotModel } from '../../db/models/analytics-snapshot.model.js';

export interface PillarAggregate {
  pillar: string;
  postCount: number;
  totalLikes: number;
  totalReposts: number;
  totalReplies: number;
}

export class PerformanceAggregator {
  public static async aggregateByPillar(sinceDate: Date): Promise<PillarAggregate[]> {
    const items = await ContentItemModel.find({
      createdAt: { $gte: sinceDate },
    });

    const aggregates: Record<string, PillarAggregate> = {};

    for (const item of items) {
      const pillar = item.topicPillar || 'General';
      if (!aggregates[pillar]) {
        aggregates[pillar] = {
          pillar,
          postCount: 0,
          totalLikes: 0,
          totalReposts: 0,
          totalReplies: 0,
        };
      }

      aggregates[pillar].postCount++;

      const snapshot = await AnalyticsSnapshotModel.findOne({
        contentItemId: item._id,
      }).sort({ fetchedAt: -1 });

      if (snapshot?.metrics) {
        aggregates[pillar].totalLikes += snapshot.metrics['likes']?.value || 0;
        aggregates[pillar].totalReposts += snapshot.metrics['reposts']?.value || 0;
        aggregates[pillar].totalReplies += snapshot.metrics['replies']?.value || 0;
      }
    }

    return Object.values(aggregates);
  }
}
