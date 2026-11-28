import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContentFormatEnum, ContentStatusEnum } from '@xgrowth/shared';
import { LocalStore } from './local-store.js';
import { LocalWorkflowService } from './workflow.service.js';
import { LocalBufferClient } from './buffer-client.js';
import { LocalPublisherService } from './local-publisher.js';

describe('LocalBufferClient & LocalPublisherService 4-Gate Safety', () => {
  let tmpDir: string;
  let store: LocalStore;
  let workflow: LocalWorkflowService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xgrowth-pub-test-'));
    store = new LocalStore(tmpDir);
    workflow = new LocalWorkflowService(store);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('blocks submission when globalPause is active (Gate 1)', async () => {
    const draft = workflow.createDraft({ text: 'Clean boundaries reduce incident blast radius.' });
    workflow.approveDraft(draft.id, 'chan-x');

    const client = new LocalBufferClient({ apiKey: 'test-key' });
    const publisher = new LocalPublisherService(store, client);

    await expect(
      publisher.submitApprovedItem({ contentItemId: draft.id, channelId: 'chan-x' }),
    ).rejects.toThrow(/Global Emergency Pause is ACTIVE/);
  });

  it('blocks unapproved items and channel hash mismatches (Gates 2 & 3)', async () => {
    workflow.toggleEmergencyPause(false);
    const draft = workflow.createDraft({ text: 'Use explicit state transitions in domain models.' });

    const client = new LocalBufferClient({ apiKey: 'test-key' });
    const publisher = new LocalPublisherService(store, client);

    await expect(
      publisher.submitApprovedItem({ contentItemId: draft.id, channelId: 'chan-x' }),
    ).rejects.toThrow(/Only 'approved' items/);

    workflow.approveDraft(draft.id, 'chan-x');

    await expect(
      publisher.submitApprovedItem({ contentItemId: draft.id, channelId: 'different-chan' }),
    ).rejects.toThrow(/Approval hash mismatch/);
  });

  it('submits approved thread to Buffer GraphQL API when unpaused', async () => {
    workflow.toggleEmergencyPause(false);
    const draft = workflow.createDraft({
      text: '1/2 Why local-first agents beat heavy stacks for solo builders.',
      threadParts: [
        '1/2 Why local-first agents beat heavy stacks for solo builders.',
        '2/2 Plain JSON files + SHA-256 approval gates keep things simple and auditable.',
      ],
      format: ContentFormatEnum.THREAD_DRAFT,
    });
    workflow.approveDraft(draft.id, '6b0a71868541f09ecbcf17c8');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          createPost: {
            __typename: 'PostActionSuccess',
            post: {
              id: 'buf-post-001',
              text: draft.text,
              status: 'queued',
            },
          },
        },
      }),
    });

    const client = new LocalBufferClient({ apiKey: 'test-key', fetchImpl: mockFetch as unknown as typeof fetch });
    const publisher = new LocalPublisherService(store, client);

    const res = await publisher.submitApprovedItem({
      contentItemId: draft.id,
      channelId: '6b0a71868541f09ecbcf17c8',
    });

    expect(res.success).toBe(true);
    expect(res.submissionId).toBe('buf-post-001');
    expect(workflow.getDraftById(draft.id)?.status).toBe(ContentStatusEnum.SUBMITTED_TO_BUFFER);
    expect(store.getQuota().usageCount).toBe(1);
  });

  it('quarantines ambiguous timeout as unknown and reconciles via channel history', async () => {
    workflow.toggleEmergencyPause(false);
    const draft = workflow.createDraft({ text: 'Never retry ambiguous createPost timeouts blindly.' });
    workflow.approveDraft(draft.id, 'chan-x');

    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';

    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(abortErr)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { account: { organizations: [{ id: 'org-1' }] } } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            channels: [{ id: 'chan-x', name: 'SayanDev01', service: 'twitter', timezone: 'Asia/Kolkata' }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            posts: {
              edges: [
                {
                  node: {
                    id: 'buf-recovered-99',
                    text: 'Never retry ambiguous createPost timeouts blindly.',
                    status: 'queued',
                  },
                },
              ],
            },
          },
        }),
      });

    const client = new LocalBufferClient({ apiKey: 'test-key', fetchImpl: mockFetch as unknown as typeof fetch });
    const publisher = new LocalPublisherService(store, client);

    await expect(
      publisher.submitApprovedItem({ contentItemId: draft.id, channelId: 'chan-x' }),
    ).rejects.toThrow(/AMBIGUOUS_TIMEOUT/);

    expect(workflow.getDraftById(draft.id)?.status).toBe(ContentStatusEnum.UNKNOWN);

    const reconciled = await publisher.reconcileStatus(draft.id);
    expect(reconciled.item.status).toBe(ContentStatusEnum.QUEUED);
    expect(reconciled.item.buffer?.submissionId).toBe('buf-recovered-99');
  });
});
