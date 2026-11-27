import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BufferGraphQLProvider } from './buffer-graphql.provider.js';
import { BufferGraphQLClient } from './buffer-graphql.client.js';

describe('BufferGraphQLProvider Unit Tests', () => {
  const provider = new BufferGraphQLProvider();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists X and Twitter channels from Buffer GraphQL account query', async () => {
    vi.spyOn(BufferGraphQLClient, 'execute').mockResolvedValueOnce({
      data: {
        account: {
          organizations: [
            {
              id: 'org-1',
              channels: [
                { id: 'ch-x', name: 'Sayang X', service: 'twitter', timezone: 'Asia/Kolkata', isQueuePaused: false },
                { id: 'ch-li', name: 'Sayang LinkedIn', service: 'linkedin', timezone: 'UTC', isQueuePaused: false },
              ],
            },
          ],
        },
      },
    });

    const res = await provider.listChannels();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toHaveLength(1);
      expect(res.value[0]?.id).toBe('ch-x');
      expect(res.value[0]?.organizationId).toBe('org-1');
    }
  });

  it('submits a single post with addToQueue mode', async () => {
    const execSpy = vi.spyOn(BufferGraphQLClient, 'execute').mockResolvedValueOnce({
      data: {
        createPost: {
          __typename: 'PostActionSuccess',
          post: {
            id: 'buf-real-101',
            text: 'Zero-allocation streaming in Node.js 24.',
            status: 'queued',
            dueAt: '2026-11-26T09:00:00.000Z',
          },
        },
      },
    });

    const res = await provider.submitPost({
      channelId: 'ch-x',
      text: 'Zero-allocation streaming in Node.js 24.',
      schedulingType: 'addToQueue',
      idempotencyKey: 'idem-key-123456',
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.id).toBe('buf-real-101');
      expect(res.value.providerStatus).toBe('queued');
    }

    const callVars = execSpy.mock.calls[0]?.[0].variables as { input: Record<string, unknown> };
    expect(callVars.input.mode).toBe('addToQueue');
    expect(callVars.input.schedulingType).toBe('automatic');
  });

  it('submits a Twitter thread using metadata.twitter.thread and customScheduled dueAt', async () => {
    const execSpy = vi.spyOn(BufferGraphQLClient, 'execute').mockResolvedValueOnce({
      data: {
        createPost: {
          __typename: 'PostActionSuccess',
          post: {
            id: 'buf-thread-202',
            text: '1/3 Why idempotency keys matter',
            status: 'scheduled',
            dueAt: '2026-11-27T13:00:00.000Z',
          },
        },
      },
    });

    const res = await provider.submitPost({
      channelId: 'ch-x',
      text: 'Thread fallback text',
      schedulingType: 'scheduled',
      dueAt: '2026-11-27T13:00:00.000Z',
      threadParts: [
        '1/3 Why idempotency keys matter',
        '2/3 Never retry ambiguous network timeouts blindly',
        '3/3 Reconcile against provider state first',
      ],
      idempotencyKey: 'idem-thread-999',
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.providerStatus).toBe('scheduled');
    }

    const callVars = execSpy.mock.calls[0]?.[0].variables as { input: any };
    expect(callVars.input.mode).toBe('customScheduled');
    expect(callVars.input.dueAt).toBe('2026-11-27T13:00:00.000Z');
    expect(callVars.input.text).toBe('1/3 Why idempotency keys matter');
    expect(callVars.input.metadata.twitter.thread).toHaveLength(3);
  });

  it('returns REQUEST_TIMEOUT on AbortError so submissions quarantine safely without retry', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    vi.spyOn(BufferGraphQLClient, 'execute').mockRejectedValueOnce(abortErr);

    const res = await provider.submitPost({
      channelId: 'ch-x',
      text: 'Timeout test post',
      schedulingType: 'addToQueue',
      idempotencyKey: 'idem-timeout-1',
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('REQUEST_TIMEOUT');
      expect(res.error.retryable).toBe(false);
    }
  });

  it('handles MutationError union response cleanly', async () => {
    vi.spyOn(BufferGraphQLClient, 'execute').mockResolvedValueOnce({
      data: {
        createPost: {
          __typename: 'MutationError',
          message: 'Twitter channel queue limit reached.',
        },
      },
    });

    const res = await provider.submitPost({
      channelId: 'ch-x',
      text: 'Queue limit post',
      schedulingType: 'publishNow',
      idempotencyKey: 'idem-limit-1',
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('BUFFER_MUTATION_FAILED');
      expect(res.error.message).toContain('queue limit');
    }
  });

  it('reconciles submission status via getPostStatus query', async () => {
    vi.spyOn(BufferGraphQLClient, 'execute').mockResolvedValueOnce({
      data: {
        post: {
          id: 'buf-real-101',
          status: 'sent',
          sentAt: '2026-11-26T09:01:00.000Z',
        },
      },
    });

    const res = await provider.reconcileSubmission('buf-real-101', 'ch-x');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.providerStatus).toBe('published');
      expect(res.value.scheduledAt).toBe('2026-11-26T09:01:00.000Z');
    }
  });

  it('recovers ambiguous timeout without postId by scanning Buffer channel post history', async () => {
    const execSpy = vi
      .spyOn(BufferGraphQLClient, 'execute')
      .mockResolvedValueOnce({
        data: {
          account: {
            organizations: [
              {
                id: 'org-1',
                channels: [{ id: 'ch-x', name: 'Sayang X', service: 'twitter' }],
              },
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          posts: {
            edges: [
              {
                node: {
                  id: 'buf-recovered-777',
                  text: 'Ambiguous timeout recovery test',
                  status: 'queued',
                  dueAt: '2026-11-28T09:00:00.000Z',
                },
              },
            ],
          },
        },
      });

    const shaKey = 'a'.repeat(64);
    const res = await provider.reconcileSubmission(shaKey, 'ch-x', 'Ambiguous timeout recovery test');

    expect(execSpy).toHaveBeenCalledTimes(2);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.id).toBe('buf-recovered-777');
      expect(res.value.providerStatus).toBe('queued');
    }
  });
});
