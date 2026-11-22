import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ResearchSourceModel } from '../db/models/research-source.model.js';
import { TopicModel } from '../db/models/topic.model.js';
import { SafeFetcher } from '../services/research/safe-fetcher.js';
import { feedParserService } from '../services/research/feed-parser.js';
import { TopicDeduplicator } from '../services/research/deduplicator.js';
import { ResearchEvaluator } from '../services/research/evaluator.js';
import { SettingsService } from '../services/settings.service.js';

const createSourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  type: z.enum(['rss', 'news', 'url', 'manual']).default('rss'),
  category: z.string().default('General'),
  enabled: z.boolean().default(true),
  credibilityScore: z.number().min(1).max(5).default(4),
});

const updateSourceSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  category: z.string().optional(),
  enabled: z.boolean().optional(),
  credibilityScore: z.number().min(1).max(5).optional(),
});

export class ResearchSourceController {
  public static async listSources(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sources = await ResearchSourceModel.find().sort({ createdAt: -1 });
      res.json(sources);
    } catch (error) {
      next(error);
    }
  }

  public static async createSource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createSourceSchema.parse(req.body);

      if (!SafeFetcher.isSafeUrl(validated.url)) {
        res.status(400).json({
          error: 'INVALID_URL',
          message: 'The provided URL is internal or disallowed.',
        });
        return;
      }

      const created = await ResearchSourceModel.create(validated);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }

  public static async updateSource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateSourceSchema.parse(req.body);

      if (validated.url && !SafeFetcher.isSafeUrl(validated.url)) {
        res.status(400).json({
          error: 'INVALID_URL',
          message: 'The provided URL is internal or disallowed.',
        });
        return;
      }

      const updated = await ResearchSourceModel.findByIdAndUpdate(
        req.params.id,
        { $set: validated },
        { new: true },
      );

      if (!updated) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Research source not found.' });
        return;
      }

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  public static async deleteSource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = await ResearchSourceModel.findByIdAndDelete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Research source not found.' });
        return;
      }
      res.json({ success: true, message: 'Research source deleted.' });
    } catch (error) {
      next(error);
    }
  }

  public static async syncSource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const source = await ResearchSourceModel.findById(req.params.id);
      if (!source) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Research source not found.' });
        return;
      }

      const settings = await SettingsService.getSettings();
      const items = await feedParserService.parseFeedUrl(source.url);
      let discoveredCount = 0;

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

        if (relevance < 2) continue;

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

      res.json({
        success: true,
        discoveredCount,
        message: `Synced feed '${source.name}'. Discovered ${discoveredCount} new topics.`,
      });
    } catch (error) {
      next(error);
    }
  }
}
