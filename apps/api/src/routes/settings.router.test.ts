import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../middlewares/correlation.js';
import { settingsRouter } from './settings.router.js';
import { errorHandler } from '../middlewares/error-handler.js';

describe('Settings and Pause Router Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/settings', settingsRouter);
  app.use(errorHandler);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('GET /api/settings returns settings object with globalPause=true by default', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.globalPause).toBe(true);
    expect(res.body.appName).toBe('XGrowth AI');
  });

  it('PATCH /api/settings updates brand pillars and operationMode', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .send({
        brandPillars: ['Node.js Architecture', 'Cloud Systems'],
        operationMode: 'approved_category_auto_submit',
      });

    expect(res.status).toBe(200);
    expect(res.body.brandPillars).toEqual(['Node.js Architecture', 'Cloud Systems']);
    expect(res.body.operationMode).toBe('approved_category_auto_submit');
  });

  it('POST /api/settings/emergency-pause activates and deactivates global pause', async () => {
    // Deactivate
    const resOff = await request(app)
      .post('/api/settings/emergency-pause')
      .send({ paused: false, reason: 'Operator verified system ready' });

    expect(resOff.status).toBe(200);
    expect(resOff.body.globalPause).toBe(false);

    // Reactivate
    const resOn = await request(app)
      .post('/api/settings/emergency-pause')
      .send({ paused: true, reason: 'Incident alert triggered' });

    expect(resOn.status).toBe(200);
    expect(resOn.body.globalPause).toBe(true);
  });
});
