import { Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';
import { RequestWithCorrelation } from './correlation.js';

export interface ApiErrorResponse {
  error: string;
  message: string;
  correlationId?: string;
  details?: unknown;
}

export function errorHandler(
  err: Error,
  req: RequestWithCorrelation,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId = req.correlationId;

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request payload failed schema validation.',
      correlationId,
      details: err.issues,
    });
    return;
  }

  logger.error({
    message: err.message,
    stack: err.stack,
    correlationId,
  });

  const statusCode = (err as { status?: number; statusCode?: number }).status ||
    (err as { status?: number; statusCode?: number }).statusCode ||
    500;

  res.status(statusCode).json({
    error: err.name || 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred.'
      : err.message,
    correlationId,
  });
}
