import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ResearchSourceController } from '../controllers/research-source.controller.js';
import { ResearchSourceModel } from '../db/models/research-source.model.js';
import { TopicModel } from '../db/models/topic.model.js';
import { BriefExtractorService } from '../services/research/brief-extractor.js';
import { TwitterAgentService } from '../services/agent/twitter-agent.service.js';
import { OpmlService } from '../services/research/opml-importer.js';
import { SafeFetcher } from '../services/research/safe-fetcher.js';
import { contentFormatSchema } from '@xgrowth/shared';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';
import { csrfProtection } from '../middlewares/csrf.js';
import { mutationRateLimiter } from '../middlewares/rate-limit.js';

export const researchRouter = Router();

researchRouter.use(singleOwnerAuthMiddleware);

// Research sources
researchRouter.get('/sources', ResearchSourceController.listSources);
researchRouter.post('/sources', csrfProtection, mutationRateLimiter, ResearchSourceController.createSource);
researchRouter.get('/sources/opml/export', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sources = await ResearchSourceModel.find().lean();
    const opml = OpmlService.exportToOpml(sources);
    res.setHeader('Content-Type', 'text/x-opml; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="xgrowth-feeds.opml"');
    res.send(opml);
  } catch (error) {
    next(error);
  }
});

researchRouter.post('/sources/opml/import', csrfProtection, mutationRateLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const xml =
      typeof req.body === 'string'
        ? req.body
        : req.body?.opmlText || req.body?.opml;
    if (!xml || typeof xml !== 'string') {
      res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'Missing opml content in request body.' });
      return;
    }

    const parsedFeeds = OpmlService.parseOpml(xml);
    const created = [];

    for (const feed of parsedFeeds) {
      const existing = await ResearchSourceModel.findOne({ url: feed.url });
      if (!existing) {
        const item = await ResearchSourceModel.create({
          name: feed.name,
          url: feed.url,
          category: feed.category,
          type: 'rss',
          credibilityScore: 4,
          enabled: true,
        });
        created.push(item);
      }
    }

    res.status(201).json({
      success: true,
      count: created.length,
      importedCount: created.length,
      sources: created,
    });
  } catch (error) {
    next(error);
  }
});

researchRouter.patch('/sources/:id', csrfProtection, mutationRateLimiter, ResearchSourceController.updateSource);
researchRouter.delete('/sources/:id', csrfProtection, mutationRateLimiter, ResearchSourceController.deleteSource);
researchRouter.post('/sources/:id/sync', csrfProtection, mutationRateLimiter, ResearchSourceController.syncSource);

// Candidate topics
const createCandidateSchema = z.object({
  title: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceName: z.string().default('Manual Entry'),
  excerpt: z.string().default(''),
  topicPillar: z.string().default('General'),
  freshnessScore: z.number().min(1).max(5).default(4),
  credibilityScore: z.number().min(1).max(5).default(4),
  relevanceScore: z.number().min(1).max(5).default(4),
});

researchRouter.get('/candidates', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, pillar } = req.query;
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (pillar) query.topicPillar = pillar;

    const candidates = await TopicModel.find(query).sort({ createdAt: -1 });
    res.json(candidates);
  } catch (error) {
    next(error);
  }
});

researchRouter.post('/candidates', csrfProtection, mutationRateLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = createCandidateSchema.parse(req.body);
    if (!SafeFetcher.isSafeUrl(validated.sourceUrl)) {
      res.status(400).json({
        error: 'INVALID_URL',
        message: 'The provided candidate sourceUrl is internal or disallowed.',
      });
      return;
    }
    const candidate = await TopicModel.create(validated);
    res.status(201).json(candidate);
  } catch (error) {
    next(error);
  }
});

researchRouter.post('/candidates/:id/to-brief', csrfProtection, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await TopicModel.findById(req.params.id);
    if (!candidate) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Candidate topic not found.' });
      return;
    }

    const brief = BriefExtractorService.extractBrief({
      title: candidate.title,
      sourceUrl: candidate.sourceUrl,
      excerpt: candidate.excerpt,
      topicPillar: candidate.topicPillar,
      freshness: candidate.freshnessScore,
      credibility: candidate.credibilityScore,
      publishedAt: candidate.publishedAt ? candidate.publishedAt.toISOString() : undefined,
    });

    candidate.status = 'briefed';
    candidate.briefId = brief.id;
    await candidate.save();

    res.json({
      success: true,
      brief,
      candidate,
    });
  } catch (error) {
    next(error);
  }
});

researchRouter.get('/candidates/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const candidate = await TopicModel.findById(req.params.id);
    if (!candidate) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Candidate topic not found.' });
      return;
    }
    res.json(candidate);
  } catch (error) {
    next(error);
  }
});

const updateCandidateSchema = z.object({
  title: z.string().min(1).optional(),
  topicPillar: z.string().optional(),
  excerpt: z.string().optional(),
  status: z.enum(['discovered', 'briefed', 'archived']).optional(),
  freshnessScore: z.number().min(1).max(5).optional(),
  credibilityScore: z.number().min(1).max(5).optional(),
  relevanceScore: z.number().min(1).max(5).optional(),
});

researchRouter.patch('/candidates/:id', csrfProtection, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = updateCandidateSchema.parse(req.body);
    const updated = await TopicModel.findByIdAndUpdate(
      req.params.id,
      { $set: validated },
      { new: true },
    );
    if (!updated) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Candidate topic not found.' });
      return;
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

researchRouter.delete('/candidates/:id', csrfProtection, mutationRateLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await TopicModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Candidate topic not found.' });
      return;
    }
    res.json({ success: true, message: 'Candidate topic deleted.' });
  } catch (error) {
    next(error);
  }
});

const runPipelineSchema = z.object({
  maxTopics: z.number().int().min(1).max(5).default(2),
  syncFeeds: z.boolean().default(true),
  format: contentFormatSchema.optional(),
  variantCount: z.number().int().min(1).max(3).default(2),
});

researchRouter.post('/agent/run-pipeline', csrfProtection, mutationRateLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = runPipelineSchema.parse(req.body || {});
    const actor = (req as { user?: { id?: string } }).user?.id || 'owner';
    const result = await TwitterAgentService.runDailyPipeline({
      ...validated,
      actor,
    });
    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});
