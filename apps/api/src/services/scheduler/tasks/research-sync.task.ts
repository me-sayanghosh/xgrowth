import { ResearchSourceModel } from '../../../db/models/research-source.model.js';
import { TopicModel } from '../../../db/models/topic.model.js';
import { feedParserService } from '../../research/feed-parser.js';
import { ResearchEvaluator } from '../../research/evaluator.js';
import { TopicDeduplicator } from '../../research/deduplicator.js';
import { SettingsService } from '../../settings.service.js';

export async function runResearchSyncTask(): Promise<string> {
  const sources = await ResearchSourceModel.find({ enabled: true });
  if (sources.length === 0) {
    return 'No active research sources configured.';
  }

  const settings = await SettingsService.getSettings();
  let discoveredCount = 0;

  for (const source of sources) {
    if (source.type !== 'rss') continue;

    try {
      const items = await feedParserService.parseFeedUrl(source.url);

      for (const item of items) {
        const normUrl = TopicDeduplicator.normalizeUrl(item.link);
        const existing = await TopicModel.findOne({ sourceUrl: normUrl });
        if (existing) continue;

        const freshness = ResearchEvaluator.calculateFreshness(item.pubDate);
        const credibility = source.credibilityScore || 4;
        const relevance = ResearchEvaluator.calculateRelevance(
          item.title,
          item.contentSnippet || '',
          settings.brandPillars,
        );

        if (relevance < 2) continue; // filter out irrelevant items

        await TopicModel.create({
          title: item.title,
          sourceUrl: normUrl,
          sourceName: source.name,
          excerpt: item.contentSnippet || '',
          topicPillar: settings.brandPillars[0] || 'General',
          freshnessScore: freshness,
          credibilityScore: credibility,
          relevanceScore: relevance,
          publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        });

        discoveredCount++;
      }

      source.lastFetchedAt = new Date();
      await source.save();
    } catch {
      // Continue next source
    }
  }

  return `Research sync finished. Ingested ${discoveredCount} new candidate topics.`;
}
