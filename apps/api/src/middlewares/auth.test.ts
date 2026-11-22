import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { singleOwnerAuthMiddleware } from './auth.js';

describe('singleOwnerAuthMiddleware Tests', () => {
  const app = express();
  app.use(singleOwnerAuthMiddleware);
  app.get('/protected', (req: any, res) => {
    res.json({ success: true, user: req.user });
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

  it('accepts dev-owner-token as valid auth token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer dev-owner-token');

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('owner');
  });
});
