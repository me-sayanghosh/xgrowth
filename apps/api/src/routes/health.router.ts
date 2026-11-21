import { Router, Request, Response } from 'express';
import { dbConnection } from '../db/connection.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/ready', (_req: Request, res: Response) => {
  const isDbReady = dbConnection.getStatus();

  if (!isDbReady) {
    res.status(503).json({
      status: 'unready',
      database: 'disconnected',
    });
    return;
  }

  res.json({
    status: 'ready',
    database: 'connected',
    timestamp: new Date().toISOString(),
  });
});
