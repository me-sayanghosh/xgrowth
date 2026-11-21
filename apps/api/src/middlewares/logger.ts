import pino from 'pino';
import { Response, NextFunction } from 'express';
import { RequestWithCorrelation } from './correlation.js';

export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-buffer-api-key"]',
      'res.headers["set-cookie"]',
      'token',
      '*.token',
      'apiKey',
      '*.apiKey',
      'password',
      '*.password',
      'bufferApiKey',
      '*.bufferApiKey',
      'geminiApiKey',
      '*.geminiApiKey',
    ],
    censor: '[REDACTED]',
  },
});

export function requestLogger(
  req: RequestWithCorrelation,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      correlationId: req.correlationId,
    });
  });

  next();
}
