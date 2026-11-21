import { Router, Request, Response, NextFunction } from 'express';
import { AuditEventModel } from '../db/models/audit-event.model.js';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';

export const auditRouter = Router();

auditRouter.use(singleOwnerAuthMiddleware);

auditRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const action = req.query.action as string;

    const query: Record<string, unknown> = {};
    if (action) {
      query.action = action;
    }

    const [events, total] = await Promise.all([
      AuditEventModel.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditEventModel.countDocuments(query),
    ]);

    res.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});
