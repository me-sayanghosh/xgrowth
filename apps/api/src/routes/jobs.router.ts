import { Router, Request, Response, NextFunction } from 'express';
import { ScheduledJobModel } from '../db/models/scheduled-job.model.js';
import { SchedulerService } from '../services/scheduler/scheduler.service.js';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';
import { csrfProtection } from '../middlewares/csrf.js';
import { mutationRateLimiter } from '../middlewares/rate-limit.js';

export const jobsRouter = Router();

jobsRouter.use(singleOwnerAuthMiddleware);

jobsRouter.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const jobs = await ScheduledJobModel.find().sort({ name: 1 });
    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

jobsRouter.post('/:id/trigger', csrfProtection, mutationRateLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const job = await ScheduledJobModel.findById(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Job not found.' });
      return;
    }

    const executed = await SchedulerService.executeJob(job.type, true);
    res.json({
      success: executed,
      message: executed ? `Job ${job.name} executed successfully.` : `Job ${job.name} execution failed or locked.`,
    });
  } catch (error) {
    next(error);
  }
});
