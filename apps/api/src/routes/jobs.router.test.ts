import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../middlewares/correlation.js';
import { jobsRouter } from './jobs.router.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { SchedulerService } from '../services/scheduler/scheduler.service.js';
import { ScheduledJobModel } from '../db/models/scheduled-job.model.js';
import { ScheduledJobTypeEnum } from '@xgrowth/shared';

describe('Jobs Router Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/jobs', jobsRouter);
  app.use(errorHandler);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await SchedulerService.initializeJobs();
    SchedulerService.registerHandler(ScheduledJobTypeEnum.RESEARCH_SYNC, async () => {
      return 'Manual test run executed.';
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('GET /api/jobs lists registered scheduled jobs', async () => {
    const res = await request(app).get('/api/jobs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);
  });

  it('POST /api/jobs/:id/trigger executes the job on-demand', async () => {
    const job = await ScheduledJobModel.findOne({ type: ScheduledJobTypeEnum.RESEARCH_SYNC });
    expect(job).toBeDefined();

    const res = await request(app)
      .post(`/api/jobs/${job!._id}/trigger`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('executed successfully');
  });
});
