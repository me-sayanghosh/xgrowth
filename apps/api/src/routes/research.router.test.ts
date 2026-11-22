import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../middlewares/correlation.js';
import { researchRouter } from './research.router.js';
import { errorHandler } from '../middlewares/error-handler.js';

describe('Research Desk API Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/research', researchRouter);
  app.use(errorHandler);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('POST /api/research/sources creates a valid source', async () => {
    const res = await request(app)
      .post('/api/research/sources')
      .send({
        name: 'Node.js Official Blog',
        url: 'https://nodejs.org/en/feed/blog.xml',
        type: 'rss',
        category: 'Backend',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Node.js Official Blog');
  });

  it('POST /api/research/sources blocks SSRF URLs', async () => {
    const res = await request(app)
      .post('/api/research/sources')
      .send({
        name: 'Internal Server',
        url: 'http://127.0.0.1:8000/feed.xml',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_URL');
  });

  it('POST /api/research/candidates creates candidate topic and converts to brief', async () => {
    const candRes = await request(app)
      .post('/api/research/candidates')
      .send({
        title: 'Node 24 introduces new Web Crypto improvements',
        sourceUrl: 'https://nodejs.org/en/blog/release/v24',
        excerpt: 'Node.js v24 brings substantial cryptographic performance gains. Some developers believe this replaces third party libs.',
        topicPillar: 'Backend and full-stack development',
      });

    expect(candRes.status).toBe(201);
    const candidateId = candRes.body._id;

    // Convert to brief
    const briefRes = await request(app)
      .post(`/api/research/candidates/${candidateId}/to-brief`)
      .send();

    expect(briefRes.status).toBe(200);
    expect(briefRes.body.success).toBe(true);
    expect(briefRes.body.brief.verifiedFacts.length).toBeGreaterThan(0);
    expect(briefRes.body.brief.uncertainties.length).toBeGreaterThan(0);
    expect(briefRes.body.candidate.status).toBe('briefed');
  });

  it('PATCH and DELETE /api/research/sources/:id updates and removes source', async () => {
    const sourceRes = await request(app)
      .post('/api/research/sources')
      .send({
        name: 'Temporary Tech Feed',
        url: 'https://example.com/rss.xml',
        type: 'rss',
        category: 'Architecture',
      });

    const sourceId = sourceRes.body._id;

    // Update
    const patchRes = await request(app)
      .patch(`/api/research/sources/${sourceId}`)
      .send({ enabled: false, credibilityScore: 5 });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.enabled).toBe(false);
    expect(patchRes.body.credibilityScore).toBe(5);

    // Delete
    const delRes = await request(app).delete(`/api/research/sources/${sourceId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  it('PATCH and DELETE /api/research/candidates/:id updates and removes candidate', async () => {
    const candRes = await request(app)
      .post('/api/research/candidates')
      .send({
        title: 'Archival test candidate topic',
        sourceUrl: 'https://example.com/archival-test',
        excerpt: 'Some interesting finding',
      });

    const candId = candRes.body._id;

    // Update status to archived
    const patchRes = await request(app)
      .patch(`/api/research/candidates/${candId}`)
      .send({ status: 'archived', topicPillar: 'Startups' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe('archived');
    expect(patchRes.body.topicPillar).toBe('Startups');

    // Delete
    const delRes = await request(app).delete(`/api/research/candidates/${candId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });
});
