import crypto from 'crypto';
import {
  AuditActionEnum,
  CharacterValidator,
  ContentFormat,
  ContentFormatEnum,
  ContentStatusEnum,
  LocalContentItem,
  LocalSettings,
  LocalTopic,
  ReferenceAccount,
  ToneLinter,
} from '@xgrowth/shared';
import { LocalStore } from './local-store.js';
import { LocalContentHasher } from './hasher.js';

export interface CreateLocalDraftInput {
  text: string;
  threadParts?: string[];
  format?: ContentFormat;
  topicPillar?: string;
  audience?: string;
  sourceUrls?: string[];
  researchNotes?: string;
  mediaUrls?: string[];
  actor?: string;
}

export interface EditLocalDraftInput {
  text?: string;
  threadParts?: string[];
  topicPillar?: string;
  audience?: string;
  mediaUrls?: string[];
}

export interface SaveReferenceAccountInput {
  handle: string;
  displayName?: string;
  profileUrl?: string;
  notes?: string;
  styleTraits?: string[];
  postArchetypes?: string[];
  samplePosts?: string[];
  topics?: string[];
}

export interface AddTopicInput {
  title: string;
  sourceUrl: string;
  sourceName?: string;
  summary?: string;
  topicPillar?: string;
  freshnessScore?: number;
}

function validatePostLengthAndLint(
  text: string,
  threadParts: string[] = [],
  format: ContentFormat = ContentFormatEnum.SINGLE_POST,
): { qualityFlags: string[]; riskFlags: string[] } {
  const lint = ToneLinter.lintDraft(text, threadParts);
  const riskFlags = [...lint.riskFlags];

  if (format === ContentFormatEnum.THREAD_DRAFT && threadParts.length > 0) {
    threadParts.forEach((part, idx) => {
      const partVal = CharacterValidator.validate(part);
      if (!partVal.isValid) {
        riskFlags.push(`Thread part ${idx + 1} exceeds 280-char X platform limit (${partVal.charCount} chars)`);
      }
    });
  } else {
    const val = CharacterValidator.validate(text);
    if (!val.isValid) {
      riskFlags.push(`Exceeds 280-char X platform limit (${val.charCount} chars)`);
    }
  }

  return { qualityFlags: lint.qualityFlags, riskFlags };
}

/**
 * Local-first editorial, approval, style-profile, and scheduling workflow engine.
 */
export class LocalWorkflowService {
  constructor(public readonly store: LocalStore) {}

  public getStatus() {
    const settings = this.store.getSettings();
    const drafts = this.store.getDrafts();
    const references = this.store.getReferences();

    const countByStatus = (status: string) => drafts.filter((d) => d.status === status).length;

    return {
      mode: 'local',
      dataDir: this.store.dataDir,
      globalPause: settings.globalPause,
      operationMode: 'review_everything',
      defaultChannelId: settings.defaultChannelId,
      timezone: settings.timezone,
      maxPostsPerDay: settings.maxPostsPerDay,
      brandPillars: settings.brandPillars,
      voiceTraits: settings.voiceTraits,
      referenceAccountsCount: references.length,
      pendingReviewCount: countByStatus(ContentStatusEnum.NEEDS_REVIEW),
      approvedCount: countByStatus(ContentStatusEnum.APPROVED),
      submittedCount:
        countByStatus(ContentStatusEnum.SUBMITTED_TO_BUFFER) +
        countByStatus(ContentStatusEnum.QUEUED) +
        countByStatus(ContentStatusEnum.PUBLISHED),
      unknownCount: countByStatus(ContentStatusEnum.UNKNOWN),
    };
  }

  public toggleEmergencyPause(paused: boolean, actor = 'owner'): { success: boolean; globalPause: boolean } {
    const settings = this.store.getSettings();
    const previousState = settings.globalPause;
    const updated = this.store.saveSettings({ ...settings, globalPause: paused });

    this.store.appendAuditEvent({
      action: AuditActionEnum.PAUSE_TOGGLED,
      actor,
      metadata: {
        previousState,
        newState: paused,
        reason: paused ? 'Emergency pause activated' : 'Emergency pause released',
      },
    });

    return { success: true, globalPause: updated.globalPause };
  }

  public getSettings(): LocalSettings {
    return this.store.getSettings();
  }

  public updateSettings(updates: Partial<LocalSettings>, actor = 'owner'): LocalSettings {
    const current = this.store.getSettings();
    const updated = this.store.saveSettings({ ...current, ...updates });
    this.store.appendAuditEvent({
      action: AuditActionEnum.SETTINGS_UPDATED,
      actor,
      metadata: { updatedFields: Object.keys(updates) },
    });
    return updated;
  }

  public createDraft(input: CreateLocalDraftInput): LocalContentItem {
    const format = input.format || (input.threadParts && input.threadParts.length > 1 ? ContentFormatEnum.THREAD_DRAFT : ContentFormatEnum.SINGLE_POST);
    const threadParts = input.threadParts || [];
    const { qualityFlags, riskFlags } = validatePostLengthAndLint(input.text, threadParts, format);
    const now = new Date().toISOString();

    const item: LocalContentItem = {
      id: `draft-${crypto.randomUUID().slice(0, 8)}`,
      status: ContentStatusEnum.NEEDS_REVIEW,
      format,
      text: input.text,
      threadParts: threadParts.length > 0 ? threadParts : undefined,
      topicPillar: input.topicPillar || 'Software engineering',
      audience: input.audience,
      sourceUrls: input.sourceUrls,
      researchNotes: input.researchNotes,
      mediaUrls: input.mediaUrls,
      qualityFlags,
      riskFlags,
      approval: null,
      buffer: null,
      scheduledFor: null,
      createdAt: now,
      updatedAt: now,
    };

    const drafts = this.store.getDrafts();
    drafts.unshift(item);
    this.store.saveDrafts(drafts);

    this.store.appendAuditEvent({
      action: AuditActionEnum.CONTENT_CREATED,
      actor: input.actor || 'antigravity-agent',
      targetId: item.id,
      targetType: 'ContentItem',
      metadata: { format, topicPillar: item.topicPillar, riskFlagsCount: riskFlags.length },
    });

    return item;
  }

  public listDrafts(status?: string): LocalContentItem[] {
    const drafts = this.store.getDrafts();
    if (!status) return drafts;
    return drafts.filter((d) => d.status === status);
  }

  public getDraftById(id: string): LocalContentItem | undefined {
    return this.store.getDrafts().find((d) => d.id === id);
  }

  public editDraft(id: string, updates: EditLocalDraftInput, actor = 'owner'): LocalContentItem {
    const drafts = this.store.getDrafts();
    const index = drafts.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new Error(`Draft not found: ${id}`);
    }

    const existing = drafts[index]!;
    if (
      existing.status === ContentStatusEnum.PUBLISHED ||
      existing.status === ContentStatusEnum.QUEUED ||
      existing.status === ContentStatusEnum.SUBMITTED_TO_BUFFER
    ) {
      throw new Error(`Cannot edit draft ${id} because status is '${existing.status}'.`);
    }

    const nextText = updates.text ?? existing.text;
    const nextThreadParts = updates.threadParts ?? existing.threadParts ?? [];
    const { qualityFlags, riskFlags } = validatePostLengthAndLint(nextText, nextThreadParts, existing.format);

    const wasApproved = existing.status === ContentStatusEnum.APPROVED;

    const updated: LocalContentItem = {
      ...existing,
      text: nextText,
      threadParts: nextThreadParts.length > 0 ? nextThreadParts : undefined,
      topicPillar: updates.topicPillar ?? existing.topicPillar,
      audience: updates.audience ?? existing.audience,
      mediaUrls: updates.mediaUrls ?? existing.mediaUrls,
      qualityFlags,
      riskFlags,
      status: wasApproved ? ContentStatusEnum.NEEDS_REVIEW : existing.status,
      contentHash: wasApproved ? undefined : existing.contentHash,
      approval: wasApproved ? null : existing.approval,
      updatedAt: new Date().toISOString(),
    };

    drafts[index] = updated;
    this.store.saveDrafts(drafts);

    if (wasApproved) {
      this.store.appendAuditEvent({
        action: AuditActionEnum.APPROVAL_INVALIDATED,
        actor,
        targetId: id,
        targetType: 'ContentItem',
        metadata: { reason: 'Content modified after approval' },
      });
    }

    this.store.appendAuditEvent({
      action: AuditActionEnum.CONTENT_EDITED,
      actor,
      targetId: id,
      targetType: 'ContentItem',
      metadata: { updatedFields: Object.keys(updates) },
    });

    return updated;
  }

  public approveDraft(id: string, channelId?: string, actor = 'owner'): LocalContentItem {
    const drafts = this.store.getDrafts();
    const index = drafts.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new Error(`Draft not found: ${id}`);
    }

    const existing = drafts[index]!;
    if (
      existing.status === ContentStatusEnum.SUBMITTED_TO_BUFFER ||
      existing.status === ContentStatusEnum.QUEUED ||
      existing.status === ContentStatusEnum.PUBLISHED
    ) {
      throw new Error(`Draft ${id} is already in status '${existing.status}'.`);
    }

    const settings = this.store.getSettings();
    const resolvedChannelId = channelId || existing.buffer?.channelId || settings.defaultChannelId;
    if (!resolvedChannelId) {
      throw new Error('Target Buffer channelId is required for approval (pass channelId or set defaultChannelId in settings).');
    }

    const approvedHash = LocalContentHasher.computeApprovalHash({
      text: existing.text,
      threadParts: existing.threadParts,
      channelId: resolvedChannelId,
      mediaUrls: existing.mediaUrls,
    });

    const now = new Date().toISOString();
    const updated: LocalContentItem = {
      ...existing,
      status: ContentStatusEnum.APPROVED,
      contentHash: approvedHash,
      approval: {
        approvedBy: actor,
        approvedAt: now,
        approvedHash,
      },
      buffer: {
        ...(existing.buffer || {}),
        channelId: resolvedChannelId,
      },
      updatedAt: now,
    };

    drafts[index] = updated;
    this.store.saveDrafts(drafts);

    this.store.appendAuditEvent({
      action: AuditActionEnum.APPROVAL_GRANTED,
      actor,
      targetId: id,
      targetType: 'ContentItem',
      metadata: { channelId: resolvedChannelId, approvedHash },
    });

    return updated;
  }

  public rejectDraft(id: string, reason = 'Rejected by owner', actor = 'owner'): LocalContentItem {
    const drafts = this.store.getDrafts();
    const index = drafts.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new Error(`Draft not found: ${id}`);
    }

    const existing = drafts[index]!;
    const updated: LocalContentItem = {
      ...existing,
      status: ContentStatusEnum.REJECTED,
      rejectionReason: reason,
      approval: null,
      contentHash: undefined,
      updatedAt: new Date().toISOString(),
    };

    drafts[index] = updated;
    this.store.saveDrafts(drafts);

    this.store.appendAuditEvent({
      action: AuditActionEnum.CONTENT_REJECTED,
      actor,
      targetId: id,
      targetType: 'ContentItem',
      metadata: { reason },
    });

    return updated;
  }

  public schedulePost(id: string, scheduledFor: string, actor = 'owner'): LocalContentItem {
    const drafts = this.store.getDrafts();
    const index = drafts.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new Error(`Draft not found: ${id}`);
    }

    const parsedDate = new Date(scheduledFor);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid ISO timestamp for scheduledFor: ${scheduledFor}`);
    }

    const existing = drafts[index]!;
    if (existing.status !== ContentStatusEnum.APPROVED) {
      throw new Error(`Only approved drafts can be scheduled. Current status: '${existing.status}'.`);
    }

    const updated: LocalContentItem = {
      ...existing,
      scheduledFor: parsedDate.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    drafts[index] = updated;
    this.store.saveDrafts(drafts);

    this.store.appendAuditEvent({
      action: AuditActionEnum.SETTINGS_UPDATED,
      actor,
      targetId: id,
      targetType: 'ContentItem',
      metadata: { scheduledFor: updated.scheduledFor },
    });

    return updated;
  }

  public getCalendarSlots(days = 7) {
    const settings = this.store.getSettings();
    const drafts = this.store.getDrafts();
    const windows = settings.preferredWindows.length > 0 ? settings.preferredWindows : ['09:00', '13:00', '19:00'];
    const now = new Date();

    const slots: Array<{
      date: string;
      windowUtc: string;
      isoTimestamp: string;
      assignedDraftId?: string;
      assignedPreview?: string;
      status?: string;
    }> = [];

    for (let d = 0; d < days; d++) {
      const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + d));
      const dateStr = day.toISOString().slice(0, 10);

      for (const win of windows) {
        const [hh = '09', mm = '00'] = win.split(':');
        const slotDate = new Date(`${dateStr}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00.000Z`);
        const isoTimestamp = slotDate.toISOString();

        const assigned = drafts.find(
          (item) =>
            item.scheduledFor &&
            item.scheduledFor.slice(0, 16) === isoTimestamp.slice(0, 16) &&
            item.status !== ContentStatusEnum.REJECTED,
        );

        slots.push({
          date: dateStr,
          windowUtc: win,
          isoTimestamp,
          assignedDraftId: assigned?.id,
          assignedPreview: assigned ? assigned.text.slice(0, 80) : undefined,
          status: assigned?.status,
        });
      }
    }

    return {
      maxPostsPerDay: settings.maxPostsPerDay,
      preferredWindows: windows,
      slots,
    };
  }

  public saveReferenceAccount(input: SaveReferenceAccountInput): ReferenceAccount {
    const normalizedHandle = input.handle.startsWith('@') ? input.handle.trim() : `@${input.handle.trim()}`;
    const refs = this.store.getReferences();
    const now = new Date().toISOString();
    const existingIdx = refs.findIndex((r) => r.handle.toLowerCase() === normalizedHandle.toLowerCase());

    if (existingIdx !== -1) {
      const existing = refs[existingIdx]!;
      const updated: ReferenceAccount = {
        ...existing,
        displayName: input.displayName ?? existing.displayName,
        profileUrl: input.profileUrl ?? existing.profileUrl,
        notes: input.notes ?? existing.notes,
        styleTraits: input.styleTraits ?? existing.styleTraits,
        postArchetypes: input.postArchetypes ?? existing.postArchetypes,
        samplePosts: input.samplePosts ?? existing.samplePosts,
        topics: input.topics ?? existing.topics,
        updatedAt: now,
      };
      refs[existingIdx] = updated;
      this.store.saveReferences(refs);
      return updated;
    }

    const created: ReferenceAccount = {
      id: `ref-${crypto.randomUUID().slice(0, 8)}`,
      handle: normalizedHandle,
      displayName: input.displayName,
      profileUrl: input.profileUrl,
      notes: input.notes || '',
      styleTraits: input.styleTraits || [],
      postArchetypes: input.postArchetypes || [],
      samplePosts: input.samplePosts || [],
      topics: input.topics || [],
      addedAt: now,
      updatedAt: now,
    };

    refs.push(created);
    this.store.saveReferences(refs);
    return created;
  }

  public listReferenceAccounts(): ReferenceAccount[] {
    return this.store.getReferences();
  }

  public deleteReferenceAccount(idOrHandle: string): boolean {
    const refs = this.store.getReferences();
    const target = idOrHandle.toLowerCase();
    const filtered = refs.filter(
      (r) => r.id.toLowerCase() !== target && r.handle.toLowerCase() !== target && r.handle.toLowerCase() !== `@${target}`,
    );
    if (filtered.length === refs.length) {
      return false;
    }
    this.store.saveReferences(filtered);
    return true;
  }

  public addTopic(input: AddTopicInput): LocalTopic {
    const topics = this.store.getTopics();
    const created: LocalTopic = {
      id: `topic-${crypto.randomUUID().slice(0, 8)}`,
      title: input.title,
      sourceName: input.sourceName || 'Manual / Web Research',
      sourceUrl: input.sourceUrl,
      summary: input.summary || '',
      topicPillar: input.topicPillar || 'Software engineering',
      freshnessScore: input.freshnessScore ?? 5,
      status: 'discovered',
      createdAt: new Date().toISOString(),
    };
    topics.unshift(created);
    this.store.saveTopics(topics);
    return created;
  }

  public listTopics(): LocalTopic[] {
    return this.store.getTopics();
  }

  public getWeeklyReport() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const drafts = this.store.getDrafts();

    const recent = drafts.filter((d) => new Date(d.createdAt) >= sevenDaysAgo);
    const published = recent.filter((d) => d.status === ContentStatusEnum.PUBLISHED);
    const queued = recent.filter(
      (d) => d.status === ContentStatusEnum.QUEUED || d.status === ContentStatusEnum.SUBMITTED_TO_BUFFER,
    );
    const needsReview = drafts.filter((d) => d.status === ContentStatusEnum.NEEDS_REVIEW);

    const pillarCounts: Record<string, number> = {};
    for (const item of [...published, ...queued]) {
      const pillar = item.topicPillar || 'General';
      pillarCounts[pillar] = (pillarCounts[pillar] || 0) + 1;
    }

    const topPillars = Object.entries(pillarCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([p, c]) => `${p} (${c})`);

    const markdownReport = [
      `# Weekly XGrowth Local Report`,
      `Period: ${sevenDaysAgo.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}`,
      ``,
      `## Pipeline Summary`,
      `- Published (confirmed): ${published.length}`,
      `- Queued / Submitted to Buffer: ${queued.length}`,
      `- Pending Review: ${needsReview.length}`,
      `- Active Pillars: ${topPillars.length > 0 ? topPillars.join(', ') : 'None yet'}`,
      ``,
      `## Provider Analytics Note`,
      `- Native X impressions/engagement: Not available from connected provider (check Buffer web dashboard for full Insights).`,
    ].join('\n');

    return {
      id: `report-${now.toISOString().slice(0, 10)}`,
      periodStart: sevenDaysAgo.toISOString(),
      periodEnd: now.toISOString(),
      markdownReport,
      whatWorked: topPillars.length > 0 ? [`Active output in ${topPillars[0]}`] : ['Awaiting first live week'],
      whatNeedsTesting: ['Compare single posts vs concise 3-part threads'],
      nextExperiments: ['Test one reference-account archetype per weekday slot'],
    };
  }
}
