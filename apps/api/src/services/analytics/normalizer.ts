import { MetricRecord } from '@xgrowth/shared';

export class MetricNormalizer {
  public static readonly UNAVAILABLE_LABEL = 'Not available from connected provider';

  public static normalizeMetric(
    name: string,
    rawValue: number | null | undefined,
    source: string,
  ): MetricRecord {
    const isAvailable = rawValue !== null && rawValue !== undefined && !isNaN(rawValue);

    return {
      name,
      value: isAvailable ? (rawValue as number) : null,
      available: isAvailable,
      unavailableReason: isAvailable ? undefined : this.UNAVAILABLE_LABEL,
      source,
      recordedAt: new Date().toISOString(),
    };
  }

  public static normalizeSet(
    rawMetrics: Record<string, number | null | undefined>,
    source = 'buffer_api',
  ): Record<string, MetricRecord> {
    const standardKeys = ['impressions', 'likes', 'replies', 'reposts', 'clicks'];
    const result: Record<string, MetricRecord> = {};

    for (const key of standardKeys) {
      result[key] = this.normalizeMetric(key, rawMetrics[key], source);
    }

    return result;
  }
}
