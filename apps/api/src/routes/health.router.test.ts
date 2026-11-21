import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { correlationMiddleware } from '../middlewares/correlation.js';
import { configureSecurityMiddlewares } from '../middlewares/security.js';
import { healthRouter } from './health.router.js';
import { errorHandler } from '../middlewares/error-handler.js';

describe('Health & Middlewares Integration Test', () => {
  const app = express();
  app.use(correlationMiddleware);
  configureSecurityMiddlewares().forEach((mw) => app.use(mw));
  app.use('/api', healthRouter);
  app.use(errorHandler);

  it('GET /api/health returns 200 with status ok and correlation ID', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-correlation-id']).toBeDefined();
    expect(res.headers['x-dns-prefetch-control']).toBeDefined(); // helmet check
  });

  it('echoes client-provided x-correlation-id header', async () => {
    const clientCorrelationId = 'client-custom-uuid-1234';
    const res = await request(app)
      .get('/api/health')
      .set('x-correlation-id', clientCorrelationId);

    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBe(clientCorrelationId);
  });
});
