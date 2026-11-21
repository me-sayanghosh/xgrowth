import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { runDatabaseSeed } from './seed.js';
import { UserSettingsModel } from './models/user-settings.model.js';
import { ResearchSourceModel } from './models/research-source.model.js';
import { TopicModel } from './models/topic.model.js';
import { ContentItemModel } from './models/content-item.model.js';
import { ScheduledJobModel } from './models/scheduled-job.model.js';
import { AuditEventModel } from './models/audit-event.model.js';

describe('Database Seed Script Test', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('successfully seeds initial collections and invariants', async () => {
    await runDatabaseSeed(mongoServer.getUri());

    const settings = await UserSettingsModel.findOne();
    expect(settings).not.toBeNull();
    expect(settings?.globalPause).toBe(true);
    expect(settings?.brandPillars.length).toBeGreaterThan(0);

    const sources = await ResearchSourceModel.find();
    expect(sources.length).toBe(4);

    const topics = await TopicModel.find();
    expect(topics.length).toBe(2);

    const items = await ContentItemModel.find();
    expect(items.length).toBe(2);

    const jobs = await ScheduledJobModel.find();
    expect(jobs.length).toBe(3);

    const audit = await AuditEventModel.findOne();
    expect(audit).not.toBeNull();
  });
});
