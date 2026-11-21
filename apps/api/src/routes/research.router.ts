import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ResearchSourceController } from '../controllers/research-source.controller.js';
import { TopicModel } from '../db/models/topic.model.js';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';
import { csrfProtection } from '../middlewares/csrf.js';

export const researchRouter = Router();

researchRouter.use(singleOwnerAuthMiddleware);

// Research sources
researchRouter.get('/sources', ResearchSourceController.listSources);
researchRouter.post('/sources', csrfProtection, ResearchSourceController.createSource);

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
