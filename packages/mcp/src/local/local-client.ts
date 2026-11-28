import {
  ContentFormat,
  LocalContentItem,
  LocalSettings,
  LocalTopic,
  ReferenceAccount,
} from '@xgrowth/shared';
import { LocalStore } from './local-store.js';
import { LocalWorkflowService } from './workflow.service.js';
import { LocalBufferClient } from './buffer-client.js';
import { LocalPublisherService } from './local-publisher.js';

/**
 * Local-first client implementing the full XGrowth MCP & CLI surface over JSON files + Buffer GraphQL.
 */
export class LocalXGrowthClient {
  public readonly store: LocalStore;
  public readonly workflow: LocalWorkflowService;
  public readonly bufferClient: LocalBufferClient;
  public readonly publisher: LocalPublisherService;

  constructor(options?: { dataDir?: string; bufferApiKey?: string; fetchImpl?: typeof fetch }) {
    this.store = new LocalStore(options?.dataDir);
    this.workflow = new LocalWorkflowService(this.store);
    this.bufferClient = new LocalBufferClient({
      apiKey: options?.bufferApiKey,
      fetchImpl: options?.fetchImpl,
    });
    this.publisher = new LocalPublisherService(this.store, this.bufferClient);
  }

  public async getStatus() {
    return this.workflow.getStatus();
  }

  public async toggleEmergencyPause(paused: boolean) {
    return this.workflow.toggleEmergencyPause(paused, 'owner');
  }

  public async getTopics() {
    return this.workflow.listTopics().map((t) => ({
      id: t.id,
      title: t.title,
      sourceName: t.sourceName,
      sourceUrl: t.sourceUrl,
      summary: t.summary,
      topicPillar: t.topicPillar,
      freshnessScore: t.freshnessScore,
      status: t.status,
    }));
  }

  public async addTopic(params: {
    title: string;
    sourceUrl: string;
    sourceName?: string;
    summary?: string;
    topicPillar?: string;
  }): Promise<LocalTopic> {
    return this.workflow.addTopic(params);
  }

  public async createDraft(params: {
    text: string;
    threadParts?: string[];
    format?: ContentFormat;
    topicPillar?: string;
    audience?: string;
    sourceUrls?: string[];
    researchNotes?: string;
    mediaUrls?: string[];
  }): Promise<LocalContentItem> {
    return this.workflow.createDraft({
      ...params,
      actor: 'antigravity-agent',
    });
  }

  public async generateDrafts(params: {
    topic: string;
    verifiedFacts: string[];
    format?: string;
    topicPillar?: string;
    language?: 'en' | 'bn' | 'mixed';
    variantCount?: number;
  }) {
    const factLine = params.verifiedFacts[0] || '';
    const text = `${params.topic}: ${factLine}`.slice(0, 275);
    const created = this.workflow.createDraft({
      text,
      format: (params.format as ContentFormat) || 'single_post',
      topicPillar: params.topicPillar,
      researchNotes: `Local seed draft. Facts: ${params.verifiedFacts.join(' | ')}. Refine directly with xgrowth_edit_draft or use xgrowth_create_draft.`,
      actor: 'local-agent',
    });
    return {
      success: true,
      items: [
        {
          id: created.id,
          status: created.status,
          format: created.format,
          text: created.text,
          topicPillar: created.topicPillar || 'Software engineering',
          qualityFlags: created.qualityFlags || [],
          riskFlags: created.riskFlags || [],
        },
      ],
    };
  }

  public async listChannels() {
    return this.publisher.listChannels();
  }

  public async runDailyPipeline(params?: {
    maxTopics?: number;
    syncFeeds?: boolean;
    format?: string;
    variantCount?: number;
  }) {
    const topics = this.workflow.listTopics().filter((t) => t.status === 'discovered');
    const maxTopics = params?.maxTopics ?? 2;
    const selected = topics.slice(0, maxTopics);

    const draftIds: string[] = [];
    for (const t of selected) {
      const text = `${t.title}${t.summary ? ` — ${t.summary}` : ''}`.slice(0, 275);
      const item = this.workflow.createDraft({
        text,
        format: (params?.format as ContentFormat) || 'educational_tip',
        topicPillar: t.topicPillar,
        sourceUrls: [t.sourceUrl],
        researchNotes: `From local topic ${t.id}. Refine via xgrowth_edit_draft before approving.`,
        actor: 'local-pipeline',
      });
      draftIds.push(item.id);
    }

    return {
      success: true,
      syncedMessage: `Local mode active: inspected ${topics.length} saved research topic(s).`,
      processedTopics: selected.length,
      generatedDraftsCount: draftIds.length,
      draftIds,
    };
  }

  public async generateHooks(params: {
    topic: string;
    pillar?: string;
    keyTakeaway?: string;
    language?: 'en' | 'bn' | 'mixed';
    count?: number;
  }) {
    const takeaway = params.keyTakeaway || 'explicit boundaries prevent production surprises';
    const hooks = [
      { hook: `Most teams overlook ${params.topic} until production breaks: ${takeaway}.`, style: 'problem_first' },
      { hook: `One practical lesson from working on ${params.topic}: ${takeaway}.`, style: 'experience' },
      { hook: `Before adopting ${params.topic}, check this trade-off: ${takeaway}.`, style: 'tradeoff' },
      { hook: `${params.topic} in plain terms: ${takeaway}.`, style: 'direct' },
    ]
      .slice(0, params.count ?? 4)
      .map((h) => ({ ...h, charCount: h.hook.length }));

    return { success: true, hooks };
  }

  public async suggestCtas(params: {
    topic: string;
    format?: string;
    language?: 'en' | 'bn' | 'mixed';
    count?: number;
  }) {
    const ctas = [
      { cta: `How are you handling ${params.topic} in your current stack?`, type: 'experience_sharing' },
      { cta: `What trade-off mattered most for you with ${params.topic}?`, type: 'tradeoff_question' },
      { cta: `Would you default to this approach or keep it simpler?`, type: 'architecture_debate' },
      { cta: `Curious what edge cases you've hit around ${params.topic}.`, type: 'peer_learning' },
    ]
      .slice(0, params.count ?? 4)
      .map((c) => ({ ...c, charCount: c.cta.length }));

    return { success: true, ctas };
  }

  public async listDrafts(status?: string) {
    return this.workflow.listDrafts(status);
  }

  public async editDraft(
    id: string,
    updates: { text?: string; threadParts?: string[]; topicPillar?: string; channelId?: string },
  ) {
    return this.workflow.editDraft(id, updates, 'owner');
  }

  public async approveDraft(id: string, channelId?: string) {
    const item = this.workflow.approveDraft(id, channelId, 'owner');
    return { success: true, item };
  }

  public async rejectDraft(id: string, reason?: string) {
    const item = this.workflow.rejectDraft(id, reason, 'owner');
    return { success: true, item };
  }

  public async getCalendarSlots(days = 7) {
    return this.workflow.getCalendarSlots(days);
  }

  public async schedulePost(contentItemId: string, scheduledFor: string) {
    const item = this.workflow.schedulePost(contentItemId, scheduledFor, 'owner');
    return { success: true, item };
  }

  public async submitToBuffer(params: {
    contentItemId: string;
    channelId?: string;
    schedulingType?: 'addToQueue' | 'scheduled' | 'publishNow';
    dueAt?: string;
  }) {
    const draft = this.workflow.getDraftById(params.contentItemId);
    const channelId = params.channelId || draft?.buffer?.channelId || this.workflow.getSettings().defaultChannelId;
    if (!channelId) {
      throw new Error('Target Buffer channelId is required (pass channelId or set defaultChannelId in settings).');
    }

    return this.publisher.submitApprovedItem({
      contentItemId: params.contentItemId,
      channelId,
      schedulingType: params.schedulingType,
      dueAt: params.dueAt,
      actor: 'owner',
    });
  }

  public async reconcileStatus(id: string) {
    return this.publisher.reconcileStatus(id, 'owner');
  }

  public async getWeeklyReport() {
    return this.workflow.getWeeklyReport();
  }

  public async saveReferenceAccount(input: {
    handle: string;
    displayName?: string;
    profileUrl?: string;
    notes?: string;
    styleTraits?: string[];
    postArchetypes?: string[];
    samplePosts?: string[];
    topics?: string[];
  }): Promise<ReferenceAccount> {
    return this.workflow.saveReferenceAccount(input);
  }

  public async listReferenceAccounts(): Promise<ReferenceAccount[]> {
    return this.workflow.listReferenceAccounts();
  }

  public async deleteReferenceAccount(idOrHandle: string): Promise<{ success: boolean }> {
    return { success: this.workflow.deleteReferenceAccount(idOrHandle) };
  }

  public async getStyleProfile(): Promise<{
    settings: LocalSettings;
    referenceAccounts: ReferenceAccount[];
  }> {
    return {
      settings: this.workflow.getSettings(),
      referenceAccounts: this.workflow.listReferenceAccounts(),
    };
  }

  public async fetchResource(uri: string): Promise<unknown> {
    if (uri === 'xgrowth://status') return this.getStatus();
    if (uri === 'xgrowth://review-queue') return this.listDrafts('needs_review');
    if (uri === 'xgrowth://weekly-report') return this.getWeeklyReport();
    if (uri === 'xgrowth://style-profile') return this.getStyleProfile();
    throw new Error(`Unsupported resource URI: ${uri}`);
  }
}
