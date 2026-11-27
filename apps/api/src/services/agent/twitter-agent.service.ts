import { ContentFormat, ContentFormatEnum, AuditActionEnum } from '@xgrowth/shared';
import { TopicModel } from '../../db/models/topic.model.js';
import { ContentItemDocument } from '../../db/models/content-item.model.js';
import { BriefExtractorService } from '../research/brief-extractor.js';
import { DraftGeneratorService } from '../ai/draft-generator.service.js';
import { AIProvider } from '../ai/ai-provider.interface.js';
import { runResearchSyncTask } from '../scheduler/tasks/research-sync.task.js';
import { SettingsService } from '../settings.service.js';
import { AuditService } from '../audit.service.js';

export interface RunAgentPipelineOptions {
  maxTopics?: number;
  syncFeeds?: boolean;
  format?: ContentFormat;
  variantCount?: number;
  actor?: string;
}

export interface AgentPipelineResult {
  syncedMessage: string;
  processedTopics: number;
  generatedDraftsCount: number;
  draftIds: string[];
  drafts: ContentItemDocument[];
}

export class TwitterAgentService {
  public static async runDailyPipeline(
    options: RunAgentPipelineOptions = {},
    aiProvider?: AIProvider,
  ): Promise<AgentPipelineResult> {
    const syncFeeds = options.syncFeeds ?? true;
    const maxTopics = Math.min(Math.max(options.maxTopics ?? 2, 1), 5);
    const variantCount = Math.min(Math.max(options.variantCount ?? 2, 1), 3);
    const actor = options.actor || 'twitter-agent';

    let syncedMessage = 'Feed sync skipped.';
    if (syncFeeds) {
      syncedMessage = await runResearchSyncTask();
    }

    const candidates = await TopicModel.find({ status: 'discovered' })
      .sort({ relevanceScore: -1, freshnessScore: -1, credibilityScore: -1, createdAt: -1 })
      .limit(maxTopics);

    if (candidates.length === 0) {
      return {
        syncedMessage,
        processedTopics: 0,
        generatedDraftsCount: 0,
        draftIds: [],
        drafts: [],
      };
    }

    const settings = await SettingsService.getSettings();
    const generator = new DraftGeneratorService(aiProvider);
    const allDrafts: ContentItemDocument[] = [];
    let processedTopics = 0;

    for (const candidate of candidates) {
      const brief = BriefExtractorService.extractBrief({
        title: candidate.title,
        sourceUrl: candidate.sourceUrl,
        excerpt: candidate.excerpt,
        topicPillar: candidate.topicPillar,
        freshness: candidate.freshnessScore,
        credibility: candidate.credibilityScore,
        publishedAt: candidate.publishedAt ? candidate.publishedAt.toISOString() : undefined,
      });

      const targetFormat =
        options.format || (brief.suggestedFormat as ContentFormat) || ContentFormatEnum.EDUCATIONAL_TIP;

      const created = await generator.generateAndPersistDrafts({
        topic: brief.topic,
        topicPillar: brief.topicPillar,
        whyItMatters: brief.whyItMatters,
        verifiedFacts: brief.verifiedFacts,
        format: targetFormat,
        language: settings.language || 'en',
        sourceUrls: [candidate.sourceUrl],
        variantCount,
      });

      candidate.status = 'briefed';
      candidate.briefId = brief.id;
      await candidate.save();

      allDrafts.push(...created);
      processedTopics++;
    }

    await AuditService.recordEvent({
      action: AuditActionEnum.CONTENT_CREATED,
      actor,
      targetType: 'AgentPipeline',
      metadata: {
        processedTopics,
        generatedDraftsCount: allDrafts.length,
        draftIds: allDrafts.map((d) => d._id.toString()),
      },
    });

    return {
      syncedMessage,
      processedTopics,
      generatedDraftsCount: allDrafts.length,
      draftIds: allDrafts.map((d) => d._id.toString()),
      drafts: allDrafts,
    };
  }
}
