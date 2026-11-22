import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { correlationMiddleware } from '../middlewares/correlation.js';
import { calendarRouter } from './calendar.router.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { ContentItemModel } from '../db/models/content-item.model.js';
import { UserSettingsModel } from '../db/models/user-settings.model.js';
import { ContentStatusEnum, ContentFormatEnum } from '@xgrowth/shared';

describe('Calendar Router Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use('/api/calendar', calendarRouter);
  app.use(errorHandler);

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    await UserSettingsModel.create({
      appName: 'XGrowth AI',
      globalPause: true,
      operationMode: 'review_everything',
      preferredWindows: ['09:00', '13:00', '19:00'],
      maxPostsPerDay: 2,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('fetches calendar slots for the next 7 days with configured windows', async () => {
    const res = await request(app).get('/api/calendar/slots?days=7');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(7);

    const firstDay = res.body[0];
    expect(firstDay.maxAllowed).toBe(2);
    expect(firstDay.slots.length).toBe(3);
    expect(firstDay.slots[0].timeWindow).toBe('09:00');
    expect(firstDay.slots[1].timeWindow).toBe('13:00');
    expect(firstDay.slots[2].timeWindow).toBe('19:00');
  });

  it('assigns a content item to a calendar slot and detects daily cap conflicts', async () => {
    // 1. Create 3 approved items
    const item1 = await ContentItemModel.create({
      status: ContentStatusEnum.APPROVED,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Morning post for calendar testing',
      topicPillar: 'Distributed Systems',
    });

    const item2 = await ContentItemModel.create({
      status: ContentStatusEnum.APPROVED,
      format: ContentFormatEnum.EDUCATIONAL_TIP,
      text: 'Afternoon post for calendar testing',
      topicPillar: 'Cloud Infrastructure',
    });

    const item3 = await ContentItemModel.create({
      status: ContentStatusEnum.APPROVED,
      format: ContentFormatEnum.OPINION_WITH_REASONING,
      text: 'Evening post exceeding daily limit of 2',
      topicPillar: 'Software Architecture',
    });

    // 2. Assign item 1 to tomorrow 09:00 UTC
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(9, 0, 0, 0);

    const res1 = await request(app)
      .post('/api/calendar/assign-slot')
      .set('x-xgrowth-csrf', '1')
      .send({
        contentItemId: item1._id.toString(),
        scheduledFor: tomorrow.toISOString(),
      });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // 3. Assign item 2 to tomorrow 13:00 UTC
    const tomorrow13 = new Date(tomorrow);
    tomorrow13.setUTCHours(13, 0, 0, 0);
    await request(app)
      .post('/api/calendar/assign-slot')
      .set('x-xgrowth-csrf', '1')
      .send({
        contentItemId: item2._id.toString(),
        scheduledFor: tomorrow13.toISOString(),
      });

    // 4. Assign item 3 to tomorrow 19:00 UTC (this exceeds maxPostsPerDay = 2)
    const tomorrow19 = new Date(tomorrow);
    tomorrow19.setUTCHours(19, 0, 0, 0);
    await request(app)
      .post('/api/calendar/assign-slot')
      .set('x-xgrowth-csrf', '1')
      .send({
        contentItemId: item3._id.toString(),
        scheduledFor: tomorrow19.toISOString(),
      });

    // 5. Inspect slots and verify conflict detection
    const slotsRes = await request(app).get('/api/calendar/slots?days=3');
    expect(slotsRes.status).toBe(200);

    const dayWithItems = slotsRes.body.find(
      (d: any) => d.date === tomorrow.toISOString().split('T')[0],
    );
    expect(dayWithItems).toBeDefined();
    expect(dayWithItems.totalScheduled).toBe(3);
    expect(dayWithItems.isOverLimit).toBe(true);

    // Check that slots on that day are marked with conflict
    expect(dayWithItems.slots[0].item.text).toBe('Morning post for calendar testing');
    expect(dayWithItems.slots[0].isConflict).toBe(true);
    expect(dayWithItems.slots[0].conflictReason).toContain('Daily cap exceeded');

    // 6. Test unassign-slot
    const unassignRes = await request(app)
      .post('/api/calendar/unassign-slot')
      .set('x-xgrowth-csrf', '1')
      .send({
        contentItemId: item3._id.toString(),
      });

    expect(unassignRes.status).toBe(200);
    expect(unassignRes.body.success).toBe(true);

    const updatedItem3 = await ContentItemModel.findById(item3._id);
    expect(updatedItem3?.scheduledFor).toBeUndefined();
  });
});
