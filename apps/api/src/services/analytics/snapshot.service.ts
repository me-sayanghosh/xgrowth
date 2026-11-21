import { AnalyticsSnapshotModel, AnalyticsSnapshotDocument } from '../../db/models/analytics-snapshot.model.js';
import { MetricRecord } from '@xgrowth/shared';

export interface IngestSnapshotInput {
  contentItemId: string;
  channelId: string;
  providerPostId?: string;
  metrics: Record<string, MetricRecord>;
  rawPayload?: Record<string, unknown>;
}

export class AnalyticsSnapshotService {
  public static async recordSnapshot(input: IngestSnapshotInput): Promise<AnalyticsSnapshotDocument> {
    const snapshot = await AnalyticsSnapshotModel.create({
      contentItemId: input.contentItemId,
      channelId: input.channelId,
      providerPostId: input.providerPostId,
      metrics: input.metrics,
      rawPayload: input.rawPayload,
      fetchedAt: new Date(),
    });

    return snapshot;
  }
}
