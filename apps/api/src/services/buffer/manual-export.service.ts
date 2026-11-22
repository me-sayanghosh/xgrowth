import { ContentItemModel } from '../../db/models/content-item.model.js';
import { ContentStatusEnum } from '@xgrowth/shared';

export interface QueueExportItem {
  id: string;
  text: string;
  format: string;
  topicPillar: string;
  scheduledFor?: string;
  threadParts: string[];
  contentHash?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export class ManualQueueExportService {
  public static async getExportItems(): Promise<QueueExportItem[]> {
    const items = await ContentItemModel.find({
      status: { $in: [ContentStatusEnum.APPROVED, ContentStatusEnum.QUEUED] },
    }).sort({ scheduledFor: 1, createdAt: -1 });

    return items.map((i) => ({
      id: i._id.toString(),
      text: i.text,
      format: i.format,
      topicPillar: i.topicPillar || 'General',
      scheduledFor: i.scheduledFor ? new Date(i.scheduledFor).toISOString() : undefined,
      threadParts: i.threadParts || [],
      contentHash: i.contentHash,
      approvedBy: i.approval?.approvedBy,
      approvedAt: i.approval?.approvedAt ? new Date(i.approval.approvedAt).toISOString() : undefined,
    }));
  }

  public static async exportToJson(): Promise<string> {
    const items = await this.getExportItems();
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        count: items.length,
        items,
      },
      null,
      2,
    );
  }

  public static async exportToCsv(): Promise<string> {
    const items = await this.getExportItems();
    const headers = [
      'ID',
      'Text',
      'Format',
      'TopicPillar',
      'ScheduledFor',
      'ThreadPartsCount',
      'ContentHash',
      'ApprovedBy',
    ];

    const escapeCsv = (str: string | undefined): string => {
      if (!str) return '""';
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = items.map((i) => [
      escapeCsv(i.id),
      escapeCsv(i.text),
      escapeCsv(i.format),
      escapeCsv(i.topicPillar),
      escapeCsv(i.scheduledFor),
      escapeCsv(i.threadParts.length.toString()),
      escapeCsv(i.contentHash),
      escapeCsv(i.approvedBy),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  public static async export(format: 'json' | 'csv' = 'json'): Promise<{
    contentType: string;
    filename: string;
    content: string;
    count: number;
  }> {
    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'csv') {
      const content = await this.exportToCsv();
      return {
        contentType: 'text/csv',
        filename: `xgrowth-queue-${dateStr}.csv`,
        content,
        count: (content.split('\n').length - 1) || 0,
      };
    }

    const content = await this.exportToJson();
    const parsed = JSON.parse(content) as { count: number };
    return {
      contentType: 'application/json',
      filename: `xgrowth-queue-${dateStr}.json`,
      content,
      count: parsed.count || 0,
    };
  }
}
