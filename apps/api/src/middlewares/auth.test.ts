import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { singleOwnerAuthMiddleware } from './auth.js';

describe('singleOwnerAuthMiddleware Tests', () => {
  const originalEnv = process.env.NODE_ENV;
  const app = express();
  app.use(singleOwnerAuthMiddleware);
  app.get('/protected', (req: any, res) => {
    res.json({ success: true, user: req.user });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('allows access in test mode with default test-owner user', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('test-owner');
  });

  it('rejects access when invalid authorization token is passed', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('accepts dev-owner-token in non-production environments', async () => {
    process.env.NODE_ENV = 'development';
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer dev-owner-token');

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('owner');
  });

  it('strictly rejects dev-owner-token and missing Authorization header in production', async () => {
    process.env.NODE_ENV = 'production';

    const missingRes = await request(app).get('/protected');
    expect(missingRes.status).toBe(401);
    expect(missingRes.body.error).toBe('UNAUTHORIZED');

    const devTokenRes = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer dev-owner-token');
    expect(devTokenRes.status).toBe(403);
    expect(devTokenRes.body.error).toBe('FORBIDDEN');
  });
});
