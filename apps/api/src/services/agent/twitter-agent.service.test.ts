import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { TwitterAgentService } from './twitter-agent.service.js';
import { TopicModel } from '../../db/models/topic.model.js';
import { ContentItemModel } from '../../db/models/content-item.model.js';
import { UserSettingsModel } from '../../db/models/user-settings.model.js';
import { MockAIAdapter } from '../ai/mock.adapter.js';
import { ContentStatusEnum, ContentFormatEnum } from '@xgrowth/shared';

describe('TwitterAgentService Pipeline Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await TopicModel.deleteMany({});
    await ContentItemModel.deleteMany({});
    await UserSettingsModel.deleteMany({});

    await UserSettingsModel.create({
      globalPause: true,
      language: 'en',
      brandPillars: ['Distributed Systems', 'TypeScript & Node.js'],
      voiceTraits: ['clear', 'practical'],
      voiceAvoid: ['game-changer'],
    });
  });

  it('ranks discovered topics, extracts briefs, and queues linted drafts in needs_review state', async () => {
    const lowScoreTopic = await TopicModel.create({
      title: 'Minor CSS Tip',
      sourceUrl: 'https://example.com/css-tip',
      sourceName: 'Blog',
      excerpt: 'Simple CSS spacing trick for cards.',
      topicPillar: 'Frontend',
      freshnessScore: 2,
      credibilityScore: 2,
      relevanceScore: 2,
      status: 'discovered',
    });

    const highScoreTopic = await TopicModel.create({
      title: 'Outbox Pattern in Event-Driven Node.js',
      sourceUrl: 'https://example.com/outbox-pattern',
      sourceName: 'Architecture Weekly',
      excerpt: 'Storing domain events in the same database transaction prevents dual-write inconsistency.',
      topicPillar: 'Distributed Systems',
      freshnessScore: 5,
      credibilityScore: 5,
      relevanceScore: 5,
      status: 'discovered',
    });

    const result = await TwitterAgentService.runDailyPipeline(
      {
        maxTopics: 1,
        syncFeeds: false,
        format: ContentFormatEnum.SINGLE_POST,
        variantCount: 2,
      },
      new MockAIAdapter(),
    );

    expect(result.processedTopics).toBe(1);
    expect(result.generatedDraftsCount).toBe(2);
    expect(result.drafts.every((d) => d.status === ContentStatusEnum.NEEDS_REVIEW)).toBe(true);
    expect(result.drafts[0]?.sourceUrls).toContain('https://example.com/outbox-pattern');

    const updatedHigh = await TopicModel.findById(highScoreTopic._id);
    const updatedLow = await TopicModel.findById(lowScoreTopic._id);
    expect(updatedHigh?.status).toBe('briefed');
    expect(updatedLow?.status).toBe('discovered');
  });

  it('returns zero counts cleanly when no discovered topics remain', async () => {
    const result = await TwitterAgentService.runDailyPipeline({ syncFeeds: false });
    expect(result.processedTopics).toBe(0);
    expect(result.generatedDraftsCount).toBe(0);
    expect(result.draftIds).toEqual([]);
  });
});
