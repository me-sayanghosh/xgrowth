import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ResearchSourceModel } from '../db/models/research-source.model.js';
import { SafeFetcher } from '../services/research/safe-fetcher.js';

const createSourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  type: z.enum(['rss', 'news', 'url', 'manual']).default('rss'),
  category: z.string().default('General'),
  enabled: z.boolean().default(true),
  credibilityScore: z.number().min(1).max(5).default(4),
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
}
