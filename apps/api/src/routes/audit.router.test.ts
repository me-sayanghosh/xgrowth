import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../middlewares/correlation.js';
import { auditRouter } from './audit.router.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { AuditEventModel } from '../db/models/audit-event.model.js';
import { AuditActionEnum } from '@xgrowth/shared';

describe('Audit Router & Export Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/audit-logs', auditRouter);
  app.use(errorHandler);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    await AuditEventModel.create({
      action: AuditActionEnum.SETTINGS_UPDATED,
      actor: 'system-owner',
      targetType: 'UserSettings',
      targetId: 'settings-1',
      metadata: { changed: ['globalPause'] },
      timestamp: new Date(),
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('retrieves paginated audit log events', async () => {
    const res = await request(app).get('/api/audit-logs');
    expect(res.status).toBe(200);
    expect(res.body.events.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('exports audit log events as formatted RFC-4180 CSV', async () => {
    const res = await request(app).get('/api/audit-logs/export');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    expect(res.header['content-disposition']).toMatch(/xgrowth-audit-logs-\d{4}-\d{2}-\d{2}\.csv/);
    expect(res.text).toContain('Timestamp,Action,Actor,TargetType,TargetID,Metadata');
    expect(res.text).toContain('SETTINGS_UPDATED');
    expect(res.text).toContain('system-owner');
  });
});
