export interface XGrowthStatus {
  globalPause: boolean;
  operationMode: string;
  brandPillars: string[];
  voiceTraits: string[];
  pendingReviewCount?: number;
  approvedCount?: number;
  submittedCount?: number;
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
  topicPillar: string;
  contentHash?: string;
  approval?: {
    approvedBy: string;
    approvedAt: string;
    approvedHash: string;
  };
  buffer?: {
    channelId?: string;
    submissionId?: string;
    providerStatus?: string;
  };
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

export class XGrowthApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(options?: { baseUrl?: string; apiKey?: string }) {
    this.baseUrl = (options?.baseUrl || process.env.XGROWTH_API_URL || 'http://localhost:3000').replace(/\/$/, '');
    this.apiKey = options?.apiKey || process.env.XGROWTH_API_KEY;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-xgrowth-csrf': '1',
      ...(options?.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorBody = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(errorBody.message || `XGrowth API request failed with status ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  public async getStatus(): Promise<XGrowthStatus> {
    const settings = await this.request<{
      globalPause: boolean;
      operationMode: string;
      brandPillars: string[];
      voiceTraits: string[];
    }>('/api/settings');

    const items = await this.request<ContentItemDetails[]>('/api/content/items').catch(() => []);

    return {
      globalPause: settings.globalPause,
      operationMode: settings.operationMode,
      brandPillars: settings.brandPillars,
      voiceTraits: settings.voiceTraits,
      pendingReviewCount: items.filter((i) => i.status === 'needs_review').length,
      approvedCount: items.filter((i) => i.status === 'approved').length,
      submittedCount: items.filter((i) => i.status === 'submitted_to_buffer' || i.status === 'queued').length,
    };
  }

  public async toggleEmergencyPause(paused: boolean): Promise<{ success: boolean; globalPause: boolean }> {
    return this.request<{ success: boolean; globalPause: boolean }>('/api/settings/emergency-pause', {
      method: 'POST',
      body: JSON.stringify({ paused }),
    });
  }

  public async getTopics(): Promise<ResearchTopic[]> {
    return this.request<ResearchTopic[]>('/api/research/candidates');
  }

  public async generateDrafts(params: {
    topic: string;
    verifiedFacts: string[];
    format?: string;
    topicPillar?: string;
    language?: 'en' | 'bn' | 'mixed';
    variantCount?: number;
  }): Promise<{ success: boolean; items: GeneratedDraftItem[] }> {
    return this.request<{ success: boolean; items: GeneratedDraftItem[] }>('/api/content/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  public async listChannels(): Promise<{
    channels: Array<{ id: string; name: string; service: string; isQueuePaused: boolean; timezone: string }>;
    quota: { monthlyLimit: number; usageCount: number; remaining: number };
  }> {
    const [channels, quota] = await Promise.all([
      this.request<Array<{ id: string; name: string; service: string; isQueuePaused: boolean; timezone: string }>>(
        '/api/buffer/channels',
      ),
      this.request<{ monthlyLimit: number; usageCount: number; remaining: number }>('/api/buffer/quota'),
    ]);
    return { channels, quota };
  }

  public async runDailyPipeline(params?: {
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
  }> {
    return this.request('/api/research/agent/run-pipeline', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  public async generateHooks(params: {
    topic: string;
    pillar?: string;
    keyTakeaway?: string;
    language?: 'en' | 'bn' | 'mixed';
    count?: number;
  }): Promise<{ success: boolean; hooks: Array<{ hook: string; style: string; charCount: number }> }> {
    return this.request('/api/content/hooks/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  public async suggestCtas(params: {
    topic: string;
    format?: string;
    language?: 'en' | 'bn' | 'mixed';
    count?: number;
  }): Promise<{ success: boolean; ctas: Array<{ cta: string; type: string; charCount: number }> }> {
    return this.request('/api/content/cta/suggest', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  public async editDraft(
    id: string,
    updates: { text?: string; threadParts?: string[]; topicPillar?: string; channelId?: string },
  ): Promise<ContentItemDetails> {
    return this.request<ContentItemDetails>(`/api/content/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async rejectDraft(id: string, reason?: string): Promise<{ success: boolean; item: ContentItemDetails }> {
    return this.request<{ success: boolean; item: ContentItemDetails }>(`/api/content/items/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public async getCalendarSlots(days = 7): Promise<unknown[]> {
    return this.request<unknown[]>(`/api/calendar/slots?days=${days}`);
  }

  public async schedulePost(contentItemId: string, scheduledFor: string): Promise<{ success: boolean; item: ContentItemDetails }> {
    return this.request<{ success: boolean; item: ContentItemDetails }>('/api/calendar/assign-slot', {
      method: 'POST',
      body: JSON.stringify({ contentItemId, scheduledFor }),
    });
  }

  public async listDrafts(status?: string): Promise<ContentItemDetails[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<ContentItemDetails[]>(`/api/content/items${query}`);
  }

  public async approveDraft(id: string, channelId: string): Promise<{ success: boolean; item: ContentItemDetails }> {
    return this.request<{ success: boolean; item: ContentItemDetails }>(`/api/content/items/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ channelId }),
    });
  }

  public async submitToBuffer(params: {
    contentItemId: string;
    channelId: string;
    schedulingType?: 'addToQueue' | 'scheduled' | 'publishNow';
    dueAt?: string;
  }): Promise<{ success: boolean; status: string; submissionId?: string; message: string }> {
    return this.request<{ success: boolean; status: string; submissionId?: string; message: string }>(
      '/api/buffer/submit',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
    );
  }

  public async reconcileStatus(id: string): Promise<{ success: boolean; item: ContentItemDetails }> {
    return this.request<{ success: boolean; item: ContentItemDetails }>(`/api/buffer/reconcile/${id}`, {
      method: 'POST',
    });
  }

  public async getWeeklyReport(): Promise<WeeklyReportSummary> {
    const reports = await this.request<WeeklyReportSummary[]>('/api/analytics/reports');
    if (reports.length > 0 && reports[0]) {
      return reports[0];
    }
    throw new Error('No weekly analytics reports available');
  }

  public async fetchResource(uri: string): Promise<unknown> {
    if (uri === 'xgrowth://status') {
      return this.getStatus();
    }
    if (uri === 'xgrowth://review-queue') {
      return this.listDrafts('needs_review');
    }
    if (uri === 'xgrowth://weekly-report') {
      return this.getWeeklyReport();
    }
    throw new Error(`Unsupported resource URI: ${uri}`);
  }
}
