import helmet from 'helmet';
import cors from 'cors';
import { RequestHandler } from 'express';
import { getEnv } from '@xgrowth/config';

export function configureSecurityMiddlewares(): RequestHandler[] {
  const env = getEnv();

  const helmetMiddleware = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", env.APP_URL],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  const corsMiddleware = cors({
    origin: [env.APP_URL, 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-xgrowth-csrf', 'x-correlation-id'],
  });

  return [helmetMiddleware, corsMiddleware];
}
