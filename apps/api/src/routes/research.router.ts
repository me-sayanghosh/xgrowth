import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ResearchSourceController } from '../controllers/research-source.controller.js';
import { TopicModel } from '../db/models/topic.model.js';
import { BriefExtractorService } from '../services/research/brief-extractor.js';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';
import { csrfProtection } from '../middlewares/csrf.js';

export const researchRouter = Router();

researchRouter.use(singleOwnerAuthMiddleware);

// Research sources
researchRouter.get('/sources', ResearchSourceController.listSources);
researchRouter.post('/sources', csrfProtection, ResearchSourceController.createSource);
researchRouter.patch('/sources/:id', csrfProtection, ResearchSourceController.updateSource);
researchRouter.delete('/sources/:id', csrfProtection, ResearchSourceController.deleteSource);
researchRouter.post('/sources/:id/sync', csrfProtection, ResearchSourceController.syncSource);

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

researchRouter.post('/candidates', csrfProtection, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = createCandidateSchema.parse(req.body);
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
