import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DraftGeneratorService } from '../services/ai/draft-generator.service.js';
import { ContentFormatEnum } from '@xgrowth/shared';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';
import { csrfProtection } from '../middlewares/csrf.js';
import { mutationRateLimiter } from '../middlewares/rate-limit.js';

export const contentGenerateRouter = Router();

contentGenerateRouter.use(singleOwnerAuthMiddleware);

const generatePayloadSchema = z.object({
  topic: z.string().min(1),
  topicPillar: z.string().default('Software engineering'),
  whyItMatters: z.string().default(''),
  verifiedFacts: z.array(z.string()).min(1),
  format: z.enum([
    ContentFormatEnum.SINGLE_POST,
    ContentFormatEnum.EDUCATIONAL_TIP,
    ContentFormatEnum.BUILD_IN_PUBLIC,
    ContentFormatEnum.OPINION_WITH_REASONING,
    ContentFormatEnum.THREAD_DRAFT,
  ]).default(ContentFormatEnum.SINGLE_POST),
  sourceUrls: z.array(z.string().url()).optional(),
  variantCount: z.number().int().min(1).max(3).default(2),
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
