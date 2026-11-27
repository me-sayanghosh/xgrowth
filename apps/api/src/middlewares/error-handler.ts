import { Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';
import { RequestWithCorrelation } from './correlation.js';

export function sanitizeErrorMessage(raw: string): string {
  return raw
    .replace(/([?&](?:key|apiKey|token|api_key|secret)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._\-~+/]+=*/gi, '$1[REDACTED]');
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

  if (err.name === 'CastError') {
    res.status(400).json({
      error: 'INVALID_ID',
      message: 'Invalid identifier format.',
      correlationId,
    });
    return;
  }

  const safeMessage = sanitizeErrorMessage(err.message || 'Unknown error');

  logger.error({
    message: safeMessage,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack ? sanitizeErrorMessage(err.stack) : undefined,
    correlationId,
  });

  const statusCode = (err as { status?: number; statusCode?: number }).status ||
    (err as { status?: number; statusCode?: number }).statusCode ||
    500;

  res.status(statusCode).json({
    error: err.name || 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred.'
      : safeMessage,
    correlationId,
  });
}
