import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DraftGeneratorService } from '../services/ai/draft-generator.service.js';
import { HookGeneratorService } from '../services/ai/hook-generator.service.js';
import { CtaRecommenderService } from '../services/ai/cta-recommender.js';
import { ContentFormatEnum, contentFormatSchema } from '@xgrowth/shared';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';
import { csrfProtection } from '../middlewares/csrf.js';
import { mutationRateLimiter } from '../middlewares/rate-limit.js';

export const contentGenerateRouter = Router();

contentGenerateRouter.use(singleOwnerAuthMiddleware);

const languageSchema = z.enum(['en', 'bn', 'mixed']).optional();

const generatePayloadSchema = z.object({
  topic: z.string().min(1),
  topicPillar: z.string().default('Software engineering'),
  whyItMatters: z.string().default(''),
  verifiedFacts: z.array(z.string()).min(1),
  format: contentFormatSchema.default(ContentFormatEnum.SINGLE_POST),
  language: languageSchema,
  sourceUrls: z.array(z.string().url()).optional(),
  variantCount: z.number().int().min(1).max(3).default(2),
});

const generateHooksSchema = z.object({
  topic: z.string().min(1),
  pillar: z.string().optional(),
  keyTakeaway: z.string().optional(),
  language: languageSchema,
  count: z.number().int().min(1).max(5).default(4),
});

const suggestCtaSchema = z.object({
  topic: z.string().min(1),
  format: contentFormatSchema.optional(),
  language: languageSchema,
  count: z.number().int().min(1).max(5).default(4),
});

contentGenerateRouter.post(
  '/generate',
  csrfProtection,
  mutationRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = generatePayloadSchema.parse(req.body);
      const generator = new DraftGeneratorService();
      const items = await generator.generateAndPersistDrafts(validated);

      res.status(201).json({
        success: true,
        count: items.length,
        items,
      });
    } catch (error) {
      next(error);
    }
  },
);

contentGenerateRouter.post(
  '/hooks/generate',
  csrfProtection,
  mutationRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = generateHooksSchema.parse(req.body);
      const hooks = await HookGeneratorService.generateHooks(validated);

      res.status(200).json({
        success: true,
        count: hooks.length,
        hooks,
      });
    } catch (error) {
      next(error);
    }
  },
);

contentGenerateRouter.post(
  '/cta/suggest',
  csrfProtection,
  mutationRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = suggestCtaSchema.parse(req.body);
      const ctas = await CtaRecommenderService.suggestCtas(validated);

      res.status(200).json({
        success: true,
        count: ctas.length,
        ctas,
      });
    } catch (error) {
      next(error);
    }
  },
);
