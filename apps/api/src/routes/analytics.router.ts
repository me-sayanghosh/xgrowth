import { Router, Request, Response, NextFunction } from 'express';
import { PerformanceAggregator } from '../services/analytics/aggregator.js';
import { WeeklyReportGenerator } from '../services/analytics/weekly-reporter.js';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';
import { csrfProtection } from '../middlewares/csrf.js';
import { mutationRateLimiter } from '../middlewares/rate-limit.js';

export const analyticsRouter = Router();

analyticsRouter.use(singleOwnerAuthMiddleware);

analyticsRouter.get('/summary', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const aggregates = await PerformanceAggregator.aggregateByPillar(thirtyDaysAgo);
    res.json({
      periodDays: 30,
      aggregates,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get('/reports', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const report = await WeeklyReportGenerator.generateReport(sevenDaysAgo, new Date());
    res.json([report]);
  } catch (error) {
    next(error);
  }
});

analyticsRouter.post('/reports/generate', csrfProtection, mutationRateLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate } = req.body;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const report = await WeeklyReportGenerator.generateReport(start, end);
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
});
