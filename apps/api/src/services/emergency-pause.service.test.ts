import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EmergencyPauseService } from './emergency-pause.service.js';
import { AuditEventModel } from '../db/models/audit-event.model.js';
import { AuditActionEnum } from '@xgrowth/shared';

describe('EmergencyPauseService', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('returns true by default if no settings record exists', async () => {
    const paused = await EmergencyPauseService.isPaused();
    expect(paused).toBe(true);
  });

  it('toggles pause off and records an audit event', async () => {
    const newStatus = await EmergencyPauseService.setPaused(false, 'test-owner', 'Testing pause toggle');
    expect(newStatus).toBe(false);

    const isNowPaused = await EmergencyPauseService.isPaused();
    expect(isNowPaused).toBe(false);

    const auditEvent = await AuditEventModel.findOne({
      action: AuditActionEnum.PAUSE_TOGGLED,
    });
    expect(auditEvent).toBeDefined();
    expect(auditEvent?.actor).toBe('test-owner');
    expect(auditEvent?.metadata?.newState).toBe(false);
  });

  it('toggles pause on and records second audit event', async () => {
    const newStatus = await EmergencyPauseService.setPaused(true, 'test-owner', 'Incident response trigger');
    expect(newStatus).toBe(true);

    const isNowPaused = await EmergencyPauseService.isPaused();
    expect(isNowPaused).toBe(true);
  });
});
