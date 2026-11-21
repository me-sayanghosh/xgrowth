import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

export function correlationMiddleware(
  req: RequestWithCorrelation,
  res: Response,
  next: NextFunction,
): void {
  const existingId = req.headers['x-correlation-id'];
  const correlationId = (typeof existingId === 'string' && existingId.trim().length > 0)
    ? existingId
    : crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
}
