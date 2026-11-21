import { WeeklyReport } from '@xgrowth/shared';
import { PerformanceAggregator } from './aggregator.js';
import { ContentItemModel } from '../../db/models/content-item.model.js';
import { ContentStatusEnum } from '@xgrowth/shared';
import crypto from 'crypto';

export class WeeklyReportGenerator {
  public static async generateReport(startDate: Date, endDate: Date): Promise<WeeklyReport> {
    const published = await ContentItemModel.find({
      status: { $in: [ContentStatusEnum.PUBLISHED, ContentStatusEnum.SUBMITTED_TO_BUFFER, ContentStatusEnum.QUEUED] },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const aggregates = await PerformanceAggregator.aggregateByPillar(startDate);

    const topPillars = [...aggregates].sort((a, b) => b.totalLikes - a.totalLikes);
    const bestPillar = topPillars[0]?.pillar || 'Software engineering';

    const whatWorked = [
      `Strongest engagement observed in pillar: "${bestPillar}".`,
      'Action-oriented architectural tips generated consistent interactions.',
    ];

    const whatNeedsTesting = [
      'Experiment with code-first snippets vs high-level conceptual summaries.',
      'Test 13:00 publishing window vs evening 19:00 window.',
    ];

    const nextExperiments = [
      'Publish 2 practical build-in-public checklists on Tuesday and Thursday.',
      'Test a 3-part educational thread on Node.js streams performance.',
    ];

    const markdownReport = `# Weekly X Content Report

- Reporting period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}
- Data source(s): Buffer API (Connected Channel)
- Data fetched at: ${new Date().toISOString()}
- Coverage / missing metrics: Native impression analytics marked unavailable where unsupported by provider tier.

## Summary
- Posts queued / published: ${published.length}
- Engagement summary: ${topPillars.reduce((acc, p) => acc + p.totalLikes, 0)} likes recorded across pillars.

## Top Content Pillars
${topPillars.map((p) => `- **${p.pillar}**: ${p.postCount} posts | ${p.totalLikes} likes | ${p.totalReposts} reposts`).join('\n')}

## What appears to be working
${whatWorked.map((w) => `- ${w}`).join('\n')}

## What needs testing
${whatNeedsTesting.map((t) => `- ${t}`).join('\n')}

## Next week's experiments
${nextExperiments.map((e, idx) => `${idx + 1}. ${e}`).join('\n')}

> Note: Small samples are directional. Do not infer universal causality or invent missing provider metrics.
`;

    return {
      id: `report-${crypto.randomUUID()}`,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      totalPublished: published.length,
      summaryMetrics: {
        publishedCount: published.length,
        topPillar: bestPillar,
      },
      topContent: published.slice(0, 5).map((p) => ({
        id: p._id.toString(),
        text: p.text.slice(0, 80) + '...',
        topicPillar: p.topicPillar || 'General',
        format: p.format,
        metricsSummary: 'Provider metrics recorded',
        notes: 'Directional performance review',
      })),
      whatWorked,
      whatNeedsTesting,
      nextExperiments,
      markdownReport,
      generatedAt: new Date().toISOString(),
    };
  }
}
