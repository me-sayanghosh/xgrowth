import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ManualQueueExportService } from './manual-export.service.js';
import { ContentItemModel } from '../../db/models/content-item.model.js';
import { ContentStatusEnum, ContentFormatEnum } from '@xgrowth/shared';
import { ContentHasher } from '../content/hasher.js';

describe('ManualQueueExportService Unit Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('exports approved items with RFC-4180 CSV escaping for quotes and commas', async () => {
    const textWithCommaAndQuotes = 'Post with "special quotes", commas, and\nnewlines.';
    const hash = ContentHasher.computeApprovalHash({ text: textWithCommaAndQuotes });

    await ContentItemModel.create({
      status: ContentStatusEnum.APPROVED,
      format: ContentFormatEnum.SINGLE_POST,
      text: textWithCommaAndQuotes,
      topicPillar: 'Distributed Systems',
      threadParts: ['Part 1', 'Part 2'],
      contentHash: hash,
      approval: {
        approvedBy: 'lead-engineer',
        approvedAt: new Date(),
        approvedHash: hash,
      },
    });

    const csvResult = await ManualQueueExportService.export('csv');
    expect(csvResult.contentType).toBe('text/csv');
    expect(csvResult.filename).toMatch(/^xgrowth-queue-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csvResult.count).toBeGreaterThanOrEqual(1);

    // Verify CSV line escaping
    expect(csvResult.content).toContain('ID,Text,Format,TopicPillar');
    expect(csvResult.content).toContain('""special quotes""');
    expect(csvResult.content).toContain('"lead-engineer"');
  });

  it('exports approved items to formatted JSON structure', async () => {
    const jsonResult = await ManualQueueExportService.export('json');
    expect(jsonResult.contentType).toBe('application/json');
    expect(jsonResult.filename).toMatch(/^xgrowth-queue-\d{4}-\d{2}-\d{2}\.json$/);

    const parsed = JSON.parse(jsonResult.content) as {
      exportedAt: string;
      count: number;
      items: Array<{ text: string; format: string; threadParts: string[] }>;
    };

    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.count).toBeGreaterThanOrEqual(1);
    expect(parsed.items[0]?.threadParts.length).toBe(2);
  });
});
