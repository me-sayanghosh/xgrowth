import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ChannelDiscoveryService } from '../services/buffer/channel-discovery.service.js';
import { BufferSubmissionService } from '../services/buffer/submission.service.js';
import { StatusReconciliationService } from '../services/buffer/reconciliation.service.js';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';
import { csrfProtection } from '../middlewares/csrf.js';
import { mutationRateLimiter } from '../middlewares/rate-limit.js';

export const bufferRouter = Router();

bufferRouter.use(singleOwnerAuthMiddleware);

bufferRouter.get('/channels', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const channels = await ChannelDiscoveryService.listXChannels();
    res.json(channels);
  } catch (error) {
    next(error);
  }
});

const submitPayloadSchema = z.object({
  contentItemId: z.string().min(1),
  channelId: z.string().min(1),
  schedulingType: z.enum(['addToQueue', 'scheduled', 'publishNow']).optional(),
  dueAt: z.string().datetime().optional(),
});

bufferRouter.post('/submit', csrfProtection, mutationRateLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = submitPayloadSchema.parse(req.body);
    const actor = (req as { user?: { id?: string } }).user?.id || 'owner';

    const submissionService = new BufferSubmissionService();
    const result = await submissionService.submitApprovedItem({
      contentItemId: validated.contentItemId,
      channelId: validated.channelId,
      schedulingType: validated.schedulingType,
      dueAt: validated.dueAt,
      actor,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

bufferRouter.post('/reconcile/:id', csrfProtection, mutationRateLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reconciler = new StatusReconciliationService();
    const item = await reconciler.reconcileItem(req.params.id as string);
    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});
