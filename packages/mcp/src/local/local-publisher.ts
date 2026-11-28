import crypto from 'crypto';
import { AuditActionEnum, ContentStatusEnum, LocalContentItem } from '@xgrowth/shared';
import { LocalStore } from './local-store.js';
import { LocalContentHasher } from './hasher.js';
import { LocalBufferClient } from './buffer-client.js';

export interface SubmitLocalPostInput {
  contentItemId: string;
  channelId: string;
  schedulingType?: 'addToQueue' | 'scheduled' | 'publishNow';
  dueAt?: string;
  actor?: string;
}

export interface SubmitLocalPostResult {
  success: boolean;
  status: string;
  submissionId?: string;
  message: string;
}

/**
 * Enforces all 4 safety gates (pause, approved state, canonical SHA-256 hash, idempotency/quota)
 * before dispatching posts to Buffer or reconciling ambiguous timeouts.
 */
export class LocalPublisherService {
  constructor(
    private readonly store: LocalStore,
    private readonly bufferClient: LocalBufferClient,
  ) {}

  public async listChannels() {
    const res = await this.bufferClient.listXChannels();
    this.store.incrementQuota(2);
    if (!res.ok) {
      throw new Error(`[${res.error.code}] ${res.error.message}`);
    }
    return {
      channels: res.value,
      quota: this.store.getQuota(),
    };
  }

  public async submitApprovedItem(input: SubmitLocalPostInput): Promise<SubmitLocalPostResult> {
    const actor = input.actor || 'owner';
    const settings = this.store.getSettings();

    // Gate 1: Global Emergency Pause
    if (settings.globalPause) {
      throw new Error('SUBMISSION_BLOCKED: Global Emergency Pause is ACTIVE. Disable pause before publishing.');
    }

    const drafts = this.store.getDrafts();
    const index = drafts.findIndex((d) => d.id === input.contentItemId);
    if (index === -1) {
      throw new Error(`Draft not found: ${input.contentItemId}`);
    }

    const item = drafts[index]!;

    // Gate 2: Strict Approved Status (blocks needs_review, unknown, submitted, etc.)
    if (item.status !== ContentStatusEnum.APPROVED) {
      throw new Error(
        `SUBMISSION_BLOCKED: Draft '${item.id}' has status '${item.status}'. Only 'approved' items can be submitted.`,
      );
    }

    // Gate 3: Canonical SHA-256 Approval Hash Verification
    const expectedHash = LocalContentHasher.computeApprovalHash({
      text: item.text,
      threadParts: item.threadParts,
      channelId: input.channelId,
      mediaUrls: item.mediaUrls,
    });

    if (!item.approval?.approvedHash || item.approval.approvedHash !== expectedHash) {
      throw new Error(
        `SUBMISSION_BLOCKED: Approval hash mismatch for '${item.id}'. Re-approve for channel '${input.channelId}' before submitting.`,
      );
    }

    // Gate 4: Daily Post Cap & Buffer Quota Guard
    const today = new Date().toISOString().slice(0, 10);
    const submittedToday = drafts.filter(
      (d) =>
        (d.status === ContentStatusEnum.SUBMITTED_TO_BUFFER ||
          d.status === ContentStatusEnum.QUEUED ||
          d.status === ContentStatusEnum.PUBLISHED) &&
        d.buffer?.submittedAt?.slice(0, 10) === today,
    ).length;

    if (submittedToday >= settings.maxPostsPerDay) {
      throw new Error(
        `SUBMISSION_BLOCKED: Daily post cap (${settings.maxPostsPerDay}) reached for ${today}.`,
      );
    }

    const quota = this.store.getQuota();
    if (quota.usageCount >= quota.monthlyLimit) {
      throw new Error(`SUBMISSION_BLOCKED: Monthly Buffer API quota (${quota.monthlyLimit}) reached.`);
    }

    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${item.id}:${expectedHash}`)
      .digest('hex');

    const schedulingType = input.schedulingType || (item.scheduledFor ? 'scheduled' : 'addToQueue');
    const dueAt = input.dueAt || item.scheduledFor || undefined;

    const resp = await this.bufferClient.submitPost({
      channelId: input.channelId,
      text: item.text,
      threadParts: item.threadParts,
      mediaUrls: item.mediaUrls,
      schedulingType,
      dueAt,
      idempotencyKey,
    });

    this.store.incrementQuota(1);
    const now = new Date().toISOString();

    if (resp.ok) {
      const updated: LocalContentItem = {
        ...item,
        status: ContentStatusEnum.SUBMITTED_TO_BUFFER,
        buffer: {
          channelId: input.channelId,
          submissionId: resp.value.id,
          providerStatus: resp.value.providerStatus,
          submittedAt: now,
          lastCheckedAt: now,
        },
        updatedAt: now,
      };
      drafts[index] = updated;
      this.store.saveDrafts(drafts);

      this.store.appendAuditEvent({
        action: AuditActionEnum.BUFFER_SUBMISSION,
        actor,
        targetId: item.id,
        targetType: 'ContentItem',
        metadata: {
          outcome: 'submitted',
          channelId: input.channelId,
          submissionId: resp.value.id,
          providerStatus: resp.value.providerStatus,
        },
      });

      return {
        success: true,
        status: updated.status,
        submissionId: resp.value.id,
        message: resp.value.message || 'Submitted to Buffer.',
      };
    }

    if (resp.error.code === 'REQUEST_TIMEOUT') {
      const quarantined: LocalContentItem = {
        ...item,
        status: ContentStatusEnum.UNKNOWN,
        buffer: {
          channelId: input.channelId,
          submissionId: idempotencyKey,
          providerStatus: 'unknown',
          submittedAt: now,
          lastCheckedAt: now,
          errorCode: 'REQUEST_TIMEOUT',
        },
        updatedAt: now,
      };
      drafts[index] = quarantined;
      this.store.saveDrafts(drafts);

      this.store.appendAuditEvent({
        action: AuditActionEnum.BUFFER_SUBMISSION,
        actor,
        targetId: item.id,
        targetType: 'ContentItem',
        metadata: {
          outcome: 'quarantined_unknown',
          errorCode: resp.error.code,
          channelId: input.channelId,
        },
      });

      throw new Error(
        `AMBIGUOUS_TIMEOUT: Submission quarantined in 'unknown' state. Run reconcile before retrying.`,
      );
    }

    const failed: LocalContentItem = {
      ...item,
      status: ContentStatusEnum.FAILED,
      buffer: {
        channelId: input.channelId,
        providerStatus: 'failed',
        lastCheckedAt: now,
        errorCode: resp.error.code,
      },
      updatedAt: now,
    };
    drafts[index] = failed;
    this.store.saveDrafts(drafts);

    this.store.appendAuditEvent({
      action: AuditActionEnum.BUFFER_SUBMISSION,
      actor,
      targetId: item.id,
      targetType: 'ContentItem',
      metadata: {
        outcome: 'failed',
        errorCode: resp.error.code,
        message: resp.error.message,
      },
    });

    throw new Error(`[${resp.error.code}] ${resp.error.message}`);
  }

  public async reconcileStatus(contentItemId: string, actor = 'owner'): Promise<{ success: boolean; item: LocalContentItem }> {
    const drafts = this.store.getDrafts();
    const index = drafts.findIndex((d) => d.id === contentItemId);
    if (index === -1) {
      throw new Error(`Draft not found: ${contentItemId}`);
    }

    const item = drafts[index]!;
    const channelId = item.buffer?.channelId || this.store.getSettings().defaultChannelId || '';
    const submissionId = item.buffer?.submissionId || '';
    const expectedText = item.threadParts?.length ? item.threadParts[0] : item.text;

    const res = await this.bufferClient.reconcileSubmission(submissionId, channelId, expectedText);
    this.store.incrementQuota(1);

    if (!res.ok) {
      throw new Error(`[${res.error.code}] ${res.error.message}`);
    }

    const now = new Date().toISOString();
    const nextStatus =
      res.value.providerStatus === 'published'
        ? ContentStatusEnum.PUBLISHED
        : res.value.providerStatus === 'queued' || res.value.providerStatus === 'scheduled'
        ? ContentStatusEnum.QUEUED
        : ContentStatusEnum.FAILED;

    const updated: LocalContentItem = {
      ...item,
      status: nextStatus,
      buffer: {
        ...(item.buffer || {}),
        channelId,
        submissionId: res.value.id || item.buffer?.submissionId,
        providerStatus: res.value.providerStatus,
        lastCheckedAt: now,
      },
      updatedAt: now,
    };

    drafts[index] = updated;
    this.store.saveDrafts(drafts);

    this.store.appendAuditEvent({
      action: AuditActionEnum.BUFFER_SUBMISSION,
      actor,
      targetId: item.id,
      targetType: 'ContentItem',
      metadata: {
        outcome: 'reconciled',
        resolvedStatus: nextStatus,
        providerStatus: res.value.providerStatus,
      },
    });

    return { success: true, item: updated };
  }
}
