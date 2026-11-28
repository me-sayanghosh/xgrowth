export interface XGrowthStatus {
  mode?: string;
  dataDir?: string;
  globalPause: boolean;
  operationMode: string;
  defaultChannelId?: string;
  brandPillars: string[];
  voiceTraits: string[];
  referenceAccountsCount?: number;
  pendingReviewCount?: number;
  approvedCount?: number;
  submittedCount?: number;
  unknownCount?: number;
}

export interface ResearchTopic {
  id: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  topicPillar: string;
  freshnessScore: number;
  status: string;
}

export interface GeneratedDraftItem {
  id: string;
  status: string;
  format: string;
  text: string;
  topicPillar: string;
  qualityFlags: string[];
  riskFlags: string[];
}

export interface ContentItemDetails {
  id: string;
  status: string;
  format: string;
  text: string;
  topicPillar?: string;
  contentHash?: string;
  approval?: {
    approvedBy: string;
    approvedAt: string;
    approvedHash: string;
  } | null;
  buffer?: {
    channelId?: string;
    submissionId?: string;
    providerStatus?: string;
  } | null;
  createdAt: string;
}

export interface WeeklyReportSummary {
  id: string;
  periodStart: string;
  periodEnd: string;
  markdownReport: string;
  whatWorked: string[];
  whatNeedsTesting: string[];
  nextExperiments: string[];
}

export interface XGrowthClientLike {
  getStatus(): Promise<XGrowthStatus>;
  toggleEmergencyPause(paused: boolean): Promise<{ success: boolean; globalPause: boolean }>;
  getTopics(): Promise<ResearchTopic[]>;
  generateDrafts(params: {
    topic: string;
    verifiedFacts: string[];
    format?: string;
    topicPillar?: string;
    language?: 'en' | 'bn' | 'mixed';
    variantCount?: number;
  }): Promise<{ success: boolean; items: GeneratedDraftItem[] }>;
  listChannels(): Promise<{
    channels: Array<{ id: string; name: string; service: string; isQueuePaused: boolean; timezone: string }>;
    quota: { monthlyLimit: number; usageCount: number; remaining: number };
  }>;
  runDailyPipeline(params?: {
    maxTopics?: number;
    syncFeeds?: boolean;
    format?: string;
    variantCount?: number;
  }): Promise<{
    success: boolean;
    syncedMessage: string;
    processedTopics: number;
    generatedDraftsCount: number;
    draftIds: string[];
  }>;
  generateHooks(params: {
    topic: string;
    pillar?: string;
    keyTakeaway?: string;
    language?: 'en' | 'bn' | 'mixed';
    count?: number;
  }): Promise<{ success: boolean; hooks: Array<{ hook: string; style: string; charCount: number }> }>;
  suggestCtas(params: {
    topic: string;
    format?: string;
    language?: 'en' | 'bn' | 'mixed';
    count?: number;
  }): Promise<{ success: boolean; ctas: Array<{ cta: string; type: string; charCount: number }> }>;
  listDrafts(status?: string): Promise<ContentItemDetails[]>;
  editDraft(
    id: string,
    updates: { text?: string; threadParts?: string[]; topicPillar?: string; channelId?: string },
  ): Promise<ContentItemDetails>;
  approveDraft(id: string, channelId?: string): Promise<{ success: boolean; item: ContentItemDetails }>;
  rejectDraft(id: string, reason?: string): Promise<{ success: boolean; item: ContentItemDetails }>;
  getCalendarSlots(days?: number): Promise<unknown>;
  schedulePost(contentItemId: string, scheduledFor: string): Promise<{ success: boolean; item: ContentItemDetails }>;
  submitToBuffer(params: {
    contentItemId: string;
    channelId?: string;
    schedulingType?: 'addToQueue' | 'scheduled' | 'publishNow';
    dueAt?: string;
  }): Promise<{ success: boolean; status: string; submissionId?: string; message: string }>;
  reconcileStatus(id: string): Promise<{ success: boolean; item: ContentItemDetails }>;
  getWeeklyReport(): Promise<WeeklyReportSummary>;
  createDraft(params: {
    text: string;
    threadParts?: string[];
    format?: string;
    topicPillar?: string;
    audience?: string;
    sourceUrls?: string[];
    researchNotes?: string;
    mediaUrls?: string[];
  }): Promise<unknown>;
  saveReferenceAccount(input: {
    handle: string;
    displayName?: string;
    profileUrl?: string;
    notes?: string;
    styleTraits?: string[];
    postArchetypes?: string[];
    samplePosts?: string[];
    topics?: string[];
  }): Promise<unknown>;
  listReferenceAccounts(): Promise<unknown[]>;
  deleteReferenceAccount(idOrHandle: string): Promise<{ success: boolean }>;
  addTopic(params: {
    title: string;
    sourceUrl: string;
    sourceName?: string;
    summary?: string;
    topicPillar?: string;
  }): Promise<unknown>;
  getStyleProfile(): Promise<unknown>;
  fetchResource(uri: string): Promise<unknown>;
}
