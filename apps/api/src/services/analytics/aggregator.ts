import { ContentItemModel } from '../../db/models/content-item.model.js';
import { AnalyticsSnapshotModel } from '../../db/models/analytics-snapshot.model.js';

export interface PillarAggregate {
  pillar: string;
  postCount: number;
  totalLikes: number;
  totalReposts: number;
  totalReplies: number;
}

export interface WowMetricDelta {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number;
}

export interface WowDeltaReport {
  posts: WowMetricDelta;
  likes: WowMetricDelta;
  reposts: WowMetricDelta;
  replies: WowMetricDelta;
}

export class PerformanceAggregator {
  public static calculateDelta(current: number, previous: number): WowMetricDelta {
    const delta = current - previous;
    let deltaPercent = 0;
    if (previous === 0) {
      deltaPercent = current > 0 ? 100 : 0;
    } else {
      deltaPercent = Math.round(((current - previous) / previous) * 100);
    }
    return {
      current,
      previous,
      delta,
      deltaPercent,
    };
  }

  public static async calculateWowDeltas(startDate: Date, endDate: Date): Promise<WowDeltaReport> {
    const durationMs = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - durationMs);
    const prevEndDate = new Date(startDate.getTime());

    // Current period metrics
    const currentItems = await ContentItemModel.find({
      createdAt: { $gte: startDate, $lte: endDate },
    });
    let currentLikes = 0;
    let currentReposts = 0;
    let currentReplies = 0;

    for (const item of currentItems) {
      const snap = await AnalyticsSnapshotModel.findOne({ contentItemId: item._id }).sort({ fetchedAt: -1 });
      if (snap?.metrics) {
        currentLikes += snap.metrics['likes']?.value || 0;
        currentReposts += snap.metrics['reposts']?.value || 0;
        currentReplies += snap.metrics['replies']?.value || 0;
      }
    }

    // Previous period metrics
    const prevItems = await ContentItemModel.find({
      createdAt: { $gte: prevStartDate, $lt: prevEndDate },
    });
    let prevLikes = 0;
    let prevReposts = 0;
    let prevReplies = 0;

    for (const item of prevItems) {
      const snap = await AnalyticsSnapshotModel.findOne({ contentItemId: item._id }).sort({ fetchedAt: -1 });
      if (snap?.metrics) {
        prevLikes += snap.metrics['likes']?.value || 0;
        prevReposts += snap.metrics['reposts']?.value || 0;
        prevReplies += snap.metrics['replies']?.value || 0;
      }
    }

    return {
      posts: this.calculateDelta(currentItems.length, prevItems.length),
      likes: this.calculateDelta(currentLikes, prevLikes),
      reposts: this.calculateDelta(currentReposts, prevReposts),
      replies: this.calculateDelta(currentReplies, prevReplies),
    };
  }

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
