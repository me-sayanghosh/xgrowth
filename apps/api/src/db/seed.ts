import mongoose from 'mongoose';
import { UserSettingsModel } from './models/user-settings.model.js';
import { ResearchSourceModel } from './models/research-source.model.js';
import { TopicModel } from './models/topic.model.js';
import { ContentItemModel } from './models/content-item.model.js';
import { ScheduledJobModel } from './models/scheduled-job.model.js';
import { AuditEventModel } from './models/audit-event.model.js';
import { ContentStatusEnum, ContentFormatEnum, AuditActionEnum, ScheduledJobTypeEnum } from '@xgrowth/shared';
import { ContentHasher } from '../services/content/hasher.js';

export async function runDatabaseSeed(mongoUri?: string): Promise<void> {
  const uri = mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/xgrowth';
  console.log(`[Seed] Connecting to MongoDB at ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}...`);

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  console.log('[Seed] Connected. Seeding operational defaults...');

  // 1. User Settings (Ensure single owner config)
  await UserSettingsModel.deleteMany({});
  await UserSettingsModel.create({
    appName: 'XGrowth AI',
    globalPause: true, // Default safe gatekeeper
    operationMode: 'review_everything',
    timezone: 'Asia/Kolkata',
    brandPillars: [
      'Software engineering',
      'TypeScript & Node.js',
      'System Architecture & Resilience',
      'AI Engineering & Agentic Systems',
    ],
    voiceTraits: [
      'Engineering rigor',
      'No hype or buzzwords',
      'Specific metrics over generalizations',
      'Clear code examples and trade-offs',
    ],
    voiceAvoid: [
      'game-changer',
      'mind-blowing',
      'revolutionize',
      'secret sauce',
      '10x developer',
    ],
    preferredWindows: ['09:00', '13:00', '19:00'],
    maxPostsPerDay: 3,
    language: 'en',
    aiProvider: 'gemini',
    aiModel: 'gemini-2.5-flash',
  });
  console.log('[Seed] ✓ Seeded UserSettings (global_pause: true)');

  // 2. Curated Research Sources
  await ResearchSourceModel.deleteMany({});
  await ResearchSourceModel.create([
    {
      name: 'Martin Fowler Architecture Guide',
      url: 'https://martinfowler.com/feed.atom',
      type: 'rss',
      category: 'Software Architecture',
      credibilityScore: 5,
      enabled: true,
    },
    {
      name: 'Uber Engineering Blog',
      url: 'https://www.uber.com/blog/engineering/rss/',
      type: 'rss',
      category: 'Distributed Systems',
      credibilityScore: 5,
      enabled: true,
    },
    {
      name: 'Netflix Technology Blog',
      url: 'https://netflixtechblog.com/feed',
      type: 'rss',
      category: 'Cloud Infrastructure',
      credibilityScore: 5,
      enabled: true,
    },
    {
      name: 'Official Node.js Blog',
      url: 'https://nodejs.org/en/feed/blog.xml',
      type: 'rss',
      category: 'Node.js & V8',
      credibilityScore: 5,
      enabled: true,
    },
  ]);
  console.log('[Seed] ✓ Seeded 4 Trusted Research Sources');

  // 3. Topics
  await TopicModel.deleteMany({});
  await TopicModel.create([
    {
      title: 'Type-Level Programming in TypeScript: Moving Runtime Bugs to Compile-Time Invariants',
      sourceName: 'TypeScript Design Patterns',
      sourceUrl: 'https://martinfowler.com/articles/patterns-of-distributed-systems/',
      summary: 'Leverage conditional types and template literal types to guarantee valid state transitions before code runs.',
      topicPillar: 'TypeScript & Node.js',
      freshnessScore: 5,
      credibilityScore: 5,
      relevanceScore: 5,
      status: 'discovered',
    },
    {
      title: 'Idempotency in Outbound Publishing APIs: Surviving Ambiguous Timeouts',
      sourceName: 'Distributed Systems Weekly',
      sourceUrl: 'https://netflixtechblog.com/fault-tolerance-in-a-high-volume-distributed-system',
      summary: 'Never blindly retry an HTTP mutation when a gateway times out. Reconcile with provider history.',
      topicPillar: 'System Architecture & Resilience',
      freshnessScore: 5,
      credibilityScore: 5,
      relevanceScore: 5,
      status: 'discovered',
    },
  ]);
  console.log('[Seed] ✓ Seeded 2 Researched Topics');

  // 4. Content Items
  await ContentItemModel.deleteMany({});
  const initialApprovedText =
    'Good software architecture is not about anticipating every future feature.\n\nIt is about making boundaries clean so components can be modified or replaced without ripple effects across the system.';
  const approvedHash = ContentHasher.computeApprovalHash({
    text: initialApprovedText,
    channelId: 'buffer-chan-x-default',
  });

  await ContentItemModel.create([
    {
      status: ContentStatusEnum.NEEDS_REVIEW,
      format: ContentFormatEnum.SINGLE_POST,
      text: 'Most production incidents in microservices come from boundary ambiguities rather than database crashes. Explicit contracts save weeks of debugging.',
      topicPillar: 'System Architecture & Resilience',
      audience: 'Senior backend engineers',
      qualityFlags: ['Clear and specific tone'],
    },
    {
      status: ContentStatusEnum.APPROVED,
      format: ContentFormatEnum.SINGLE_POST,
      text: initialApprovedText,
      topicPillar: 'Software engineering',
      audience: 'Software engineers and architects',
      contentHash: approvedHash,
      approval: {
        approvedBy: 'system-seed',
        approvedAt: new Date(),
        approvedHash,
      },
      buffer: {
        channelId: 'buffer-chan-x-default',
      },
    },
  ]);
  console.log('[Seed] ✓ Seeded Initial Content Items (1 needs_review, 1 approved)');

  // 5. Scheduled background jobs
  await ScheduledJobModel.deleteMany({});
  await ScheduledJobModel.create([
    {
      name: 'RSS Research Feed Ingestion',
      type: ScheduledJobTypeEnum.RESEARCH_SYNC,
      cronExpression: '0 */6 * * *',
      enabled: true,
      status: 'idle',
    },
    {
      name: 'Buffer Channel Status Reconciliation',
      type: ScheduledJobTypeEnum.STATUS_RECONCILIATION,
      cronExpression: '*/30 * * * *',
      enabled: true,
      status: 'idle',
    },
    {
      name: 'Analytical Metric Aggregation & Import',
      type: ScheduledJobTypeEnum.ANALYTICS_IMPORT,
      cronExpression: '0 9 * * 1',
      enabled: true,
      status: 'idle',
    },
  ]);
  console.log('[Seed] ✓ Seeded Background Scheduled Jobs');

  // 6. Audit Trail Initialization
  await AuditEventModel.create({
    action: AuditActionEnum.SETTINGS_UPDATED,
    actor: 'system-seed',
    metadata: { description: 'Database seeded with default brand configuration and fixtures.' },
    timestamp: new Date().toISOString(),
  });
  console.log('[Seed] ✓ Recorded Initial Audit Event');

  console.log('[Seed] Database initialization complete!');
}

// Auto-run if executed directly via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runDatabaseSeed()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}
