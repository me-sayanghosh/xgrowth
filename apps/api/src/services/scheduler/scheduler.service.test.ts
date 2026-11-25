import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SchedulerService } from './scheduler.service.js';
import { ScheduledJobModel } from '../../db/models/scheduled-job.model.js';
import { ScheduledJobTypeEnum } from '@xgrowth/shared';

describe('SchedulerService', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('initializes default jobs idempotently', async () => {
    await SchedulerService.initializeJobs();
    const count = await ScheduledJobModel.countDocuments();
    expect(count).toBe(4);

    // Re-run initialization to confirm idempotency
    await SchedulerService.initializeJobs();
    const count2 = await ScheduledJobModel.countDocuments();
    expect(count2).toBe(4);
  });

  it('executes a registered job successfully and logs duration', async () => {
    SchedulerService.registerHandler(ScheduledJobTypeEnum.RESEARCH_SYNC, async () => {
      return 'Synced 5 items successfully.';
    });

    const success = await SchedulerService.executeJob(ScheduledJobTypeEnum.RESEARCH_SYNC);
    expect(success).toBe(true);

    const job = await ScheduledJobModel.findOne({ type: ScheduledJobTypeEnum.RESEARCH_SYNC });
    expect(job?.status).toBe('idle');
    expect(job?.lastRunAt).toBeDefined();
    expect(job?.logs.length).toBeGreaterThan(0);
    expect(job?.logs[0]?.status).toBe('success');
  });

  it('marks job as failed when handler throws error', async () => {
    SchedulerService.registerHandler(ScheduledJobTypeEnum.ANALYTICS_IMPORT, async () => {
      throw new Error('Upstream analytics connection failed.');
    });

    const success = await SchedulerService.executeJob(ScheduledJobTypeEnum.ANALYTICS_IMPORT);
    expect(success).toBe(false);

    const job = await ScheduledJobModel.findOne({ type: ScheduledJobTypeEnum.ANALYTICS_IMPORT });
    expect(job?.status).toBe('failed');
    expect(job?.logs[0]?.status).toBe('failed');
    expect(job?.logs[0]?.error).toContain('Upstream analytics connection failed');
  });
});
