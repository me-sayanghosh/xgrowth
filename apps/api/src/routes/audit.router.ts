import { Router, Request, Response, NextFunction } from 'express';
import { AuditEventModel } from '../db/models/audit-event.model.js';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';

export const auditRouter = Router();

auditRouter.use(singleOwnerAuthMiddleware);

auditRouter.get('/export', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const action = req.query.action as string;
    const query: Record<string, unknown> = {};
    if (action) {
      query.action = action;
    }

    const events = await AuditEventModel.find(query).sort({ timestamp: -1 }).limit(1000).lean();

    const headers = ['Timestamp', 'Action', 'Actor', 'TargetType', 'TargetID', 'Metadata'];

    const escapeCsv = (str: string | undefined): string => {
      if (!str) return '""';
      const escaped = String(str).replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = events.map((e) => [
      escapeCsv(e.timestamp ? new Date(e.timestamp).toISOString() : ''),
      escapeCsv(e.action),
      escapeCsv(e.actor),
      escapeCsv(e.targetType),
      escapeCsv(e.targetId),
      escapeCsv(e.metadata ? JSON.stringify(e.metadata) : ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="xgrowth-audit-logs-${dateStr}.csv"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

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
