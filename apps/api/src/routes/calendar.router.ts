import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CalendarService } from '../services/calendar/calendar.service.js';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';
import { csrfProtection } from '../middlewares/csrf.js';
import { mutationRateLimiter } from '../middlewares/rate-limit.js';

export const calendarRouter = Router();

calendarRouter.use(singleOwnerAuthMiddleware);

const assignSlotSchema = z.object({
  contentItemId: z.string().min(1),
  scheduledFor: z.string().datetime(),
});

const unassignSlotSchema = z.object({
  contentItemId: z.string().min(1),
});

calendarRouter.get(
  '/slots',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
      const summaries = await CalendarService.getCalendarSlots(Math.min(Math.max(days, 1), 30));
      res.json(summaries);
    } catch (error) {
      next(error);
    }
  },
);

calendarRouter.post(
  '/assign-slot',
  csrfProtection,
  mutationRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { contentItemId, scheduledFor } = assignSlotSchema.parse(req.body);
      const item = await CalendarService.assignSlot(contentItemId, scheduledFor);
      res.json({ success: true, item });
    } catch (error) {
      next(error);
    }
  },
);

calendarRouter.post(
  '/unassign-slot',
  csrfProtection,
  mutationRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { contentItemId } = unassignSlotSchema.parse(req.body);
      const item = await CalendarService.unassignSlot(contentItemId);
      res.json({ success: true, item });
    } catch (error) {
      next(error);
    }
  },
);
