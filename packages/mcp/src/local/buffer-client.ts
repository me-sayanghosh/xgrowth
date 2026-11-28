import { getEnv } from '@xgrowth/config';
import { BufferChannel, BufferPostInput, BufferPostResponse, Result, ok, err } from '@xgrowth/shared';

export interface BufferClientError {
  code: string;
  message: string;
  retryable: boolean;
  statusCode?: number;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface OrganizationsData {
  account?: {
    organizations?: Array<{ id: string }>;
  };
}

interface ChannelsData {
  channels?: Array<{
    id: string;
    name: string;
    service: string;
    avatar?: string;
    isQueuePaused?: boolean;
    timezone?: string;
  }>;
}

interface CreatePostData {
  createPost?: {
    __typename?: string;
    post?: {
      id: string;
      text: string;
      status?: string;
      dueAt?: string;
    };
    message?: string;
  };
}

interface GetPostData {
  post?: {
    id: string;
    status?: string;
    dueAt?: string;
    sentAt?: string;
  } | null;
}

interface ChannelPostsData {
  posts?: {
    edges?: Array<{
      node?: {
        id: string;
        text?: string;
        status?: string;
        dueAt?: string;
        sentAt?: string;
      };
    }>;
  };
}

function mapProviderStatus(
  rawStatus: string | undefined,
  schedulingType: BufferPostInput['schedulingType'],
): BufferPostResponse['providerStatus'] {
  const normalized = (rawStatus || '').toLowerCase();
  if (normalized === 'sent' || normalized === 'published') return 'published';
  if (normalized === 'scheduled' || schedulingType === 'scheduled') return 'scheduled';
  if (normalized === 'error' || normalized === 'failed') return 'failed';
  return 'queued';
}

function classifyError(error: unknown): BufferClientError {
  const errObj = error instanceof Error ? error : new Error(String(error));
  const msg = errObj.message;

  if (errObj.name === 'AbortError' || msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('timeout')) {
    return {
      code: 'REQUEST_TIMEOUT',
      message: `Buffer API request timed out: ${msg}`,
      retryable: false,
    };
  }

  const httpMatch = msg.match(/Buffer API HTTP (\d+):/);
  const statusCode = httpMatch?.[1] ? parseInt(httpMatch[1], 10) : undefined;

  if (statusCode === 401 || statusCode === 403) {
    return { code: 'BUFFER_AUTH_FAILED', message: msg, retryable: false, statusCode };
  }
  if (statusCode === 429) {
    return { code: 'BUFFER_RATE_LIMITED', message: msg, retryable: true, statusCode };
  }

  return {
    code: 'BUFFER_API_ERROR',
    message: msg,
    retryable: statusCode !== undefined && statusCode >= 500,
    statusCode,
  };
}

function normalizeForMatch(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

/**
 * Standalone Buffer GraphQL client talking directly to https://api.buffer.com using server-side BUFFER_API_KEY.
 */
export class LocalBufferClient {
  public static readonly ENDPOINT = 'https://api.buffer.com';

  private apiKeyOverride?: string;
  private fetchImpl: typeof fetch;

  constructor(options?: { apiKey?: string; fetchImpl?: typeof fetch }) {
    this.apiKeyOverride = options?.apiKey;
    this.fetchImpl = options?.fetchImpl || fetch;
  }

  private async execute<T>(query: string, variables?: Record<string, unknown>, timeoutMs = 10000): Promise<GraphQLResponse<T>> {
    const apiKey = this.apiKeyOverride ?? getEnv().BUFFER_API_KEY;
    if (!apiKey || apiKey === 'mock-buffer-api-key') {
      throw new Error('BUFFER_API_KEY is not configured in .env.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchImpl(LocalBufferClient.ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'User-Agent': 'XGrowth-AI-Local/1.0',
        },
        body: JSON.stringify({ query, variables: variables || {} }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Buffer API HTTP ${response.status}: ${text}`);
      }

      return (await response.json()) as GraphQLResponse<T>;
    } finally {
      clearTimeout(timeout);
    }
  }

  public async listXChannels(): Promise<Result<BufferChannel[], BufferClientError>> {
    const orgQuery = `
      query GetOrganizations {
        account {
          organizations {
            id
          }
        }
      }
    `;

    const channelsQuery = `
      query GetChannels($input: ChannelsInput!) {
        channels(input: $input) {
          id
          name
          service
          avatar
          isQueuePaused
          timezone
        }
      }
    `;

    try {
      const orgResp = await this.execute<OrganizationsData>(orgQuery);
      if (orgResp.errors?.length) {
        return err({
          code: 'BUFFER_GRAPHQL_ERROR',
          message: orgResp.errors.map((e) => e.message).join('; '),
          retryable: false,
        });
      }

      const channels: BufferChannel[] = [];
      for (const org of orgResp.data?.account?.organizations || []) {
        if (!org.id) continue;
        const chResp = await this.execute<ChannelsData>(channelsQuery, { input: { organizationId: org.id } });
        if (chResp.errors?.length) {
          return err({
            code: 'BUFFER_GRAPHQL_ERROR',
            message: chResp.errors.map((e) => e.message).join('; '),
            retryable: false,
          });
        }

        for (const ch of chResp.data?.channels || []) {
          if (ch.service === 'x' || ch.service === 'twitter') {
            channels.push({
              id: ch.id,
              name: ch.name,
              service: ch.service,
              avatar: ch.avatar,
              organizationId: org.id,
              isQueuePaused: ch.isQueuePaused || false,
              timezone: ch.timezone || 'UTC',
            });
          }
        }
      }

      return ok(channels);
    } catch (error) {
      return err(classifyError(error));
    }
  }

  public async submitPost(input: BufferPostInput): Promise<Result<BufferPostResponse, BufferClientError>> {
    const mode =
      input.schedulingType === 'scheduled'
        ? 'customScheduled'
        : input.schedulingType === 'publishNow'
        ? 'shareNow'
        : 'addToQueue';

    const hasThread = Array.isArray(input.threadParts) && input.threadParts.length > 1;
    const primaryText = hasThread ? input.threadParts![0] || input.text : input.text;

    const createInput: Record<string, unknown> = {
      text: primaryText,
      channelId: input.channelId,
      schedulingType: 'automatic',
      mode,
    };

    if (mode === 'customScheduled' && input.dueAt) {
      createInput.dueAt = input.dueAt;
    }
    if (input.mediaUrls?.length) {
      createInput.assets = input.mediaUrls.map((url) => ({ url }));
    }
    if (hasThread) {
      createInput.metadata = {
        twitter: {
          isAiGenerated: false,
          thread: input.threadParts!.map((part) => ({ text: part })),
        },
      };
    }

    const mutation = `
      mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          __typename
          ... on PostActionSuccess {
            post {
              id
              text
              status
              dueAt
            }
          }
          ... on MutationError {
            message
          }
        }
      }
    `;

    try {
      const resp = await this.execute<CreatePostData>(mutation, { input: createInput });
      if (resp.errors?.length) {
        return err({
          code: 'BUFFER_GRAPHQL_ERROR',
          message: resp.errors.map((e) => e.message).join('; '),
          retryable: false,
        });
      }

      const payload = resp.data?.createPost;
      if (!payload) {
        return err({
          code: 'EMPTY_RESPONSE',
          message: 'Buffer API returned an empty createPost payload.',
          retryable: false,
        });
      }

      if (payload.post) {
        return ok({
          success: true,
          id: payload.post.id,
          providerStatus: mapProviderStatus(payload.post.status, input.schedulingType),
          scheduledAt: payload.post.dueAt || input.dueAt,
          message: 'Post successfully submitted to Buffer.',
          correlationId: input.idempotencyKey.slice(0, 12),
        });
      }

      return err({
        code: 'BUFFER_MUTATION_FAILED',
        message: payload.message || 'Buffer rejected the createPost mutation.',
        retryable: false,
      });
    } catch (error) {
      return err(classifyError(error));
    }
  }

  public async getPostStatus(
    postId: string,
  ): Promise<Result<{ status: BufferPostResponse['providerStatus']; scheduledAt?: string }, BufferClientError>> {
    const query = `
      query GetPost($input: PostInput!) {
        post(input: $input) {
          id
          status
          dueAt
          sentAt
        }
      }
    `;

    try {
      const resp = await this.execute<GetPostData>(query, { input: { id: postId } });
      if (resp.errors?.length) {
        return err({
          code: 'BUFFER_GRAPHQL_ERROR',
          message: resp.errors.map((e) => e.message).join('; '),
          retryable: false,
        });
      }

      const post = resp.data?.post;
      if (!post) {
        return err({
          code: 'POST_NOT_FOUND',
          message: `Buffer post not found: ${postId}`,
          retryable: false,
        });
      }

      return ok({
        status: mapProviderStatus(post.status, 'addToQueue'),
        scheduledAt: post.sentAt || post.dueAt,
      });
    } catch (error) {
      return err(classifyError(error));
    }
  }

  public async reconcileSubmission(
    submissionId: string,
    channelId: string,
    expectedText?: string,
  ): Promise<Result<BufferPostResponse, BufferClientError>> {
    const looksLikeIdempotencyKey = /^[a-f0-9]{64}$/i.test(submissionId) || !submissionId;

    if (!looksLikeIdempotencyKey) {
      const statusRes = await this.getPostStatus(submissionId);
      if (statusRes.ok) {
        return ok({
          success: statusRes.value.status !== 'failed',
          id: submissionId,
          providerStatus: statusRes.value.status,
          scheduledAt: statusRes.value.scheduledAt,
          message: `Reconciled via Buffer GraphQL API (status: ${statusRes.value.status}).`,
        });
      }
      if (!expectedText) {
        return err(statusRes.error);
      }
    }

    if (!expectedText) {
      return err({
        code: 'MISSING_RECONCILIATION_CONTEXT',
        message: 'Cannot reconcile without a Buffer post ID or expected post text.',
        retryable: false,
      });
    }

    const channelsRes = await this.listXChannels();
    if (!channelsRes.ok) {
      return err(channelsRes.error);
    }

    const matchedChannel = channelsRes.value.find((c) => c.id === channelId) || channelsRes.value[0];
    const organizationId = matchedChannel?.organizationId;
    if (!organizationId) {
      return err({
        code: 'ORGANIZATION_NOT_FOUND',
        message: `Could not resolve Buffer organization for channel ${channelId}.`,
        retryable: false,
      });
    }

    const postsQuery = `
      query GetChannelPosts($input: PostsInput!) {
        posts(input: $input) {
          edges {
            node {
              id
              text
              status
              dueAt
              sentAt
            }
          }
        }
      }
    `;

    try {
      const resp = await this.execute<ChannelPostsData>(postsQuery, {
        input: {
          organizationId,
          filter: { channelIds: [channelId] },
        },
      });

      if (resp.errors?.length) {
        return err({
          code: 'BUFFER_GRAPHQL_ERROR',
          message: resp.errors.map((e) => e.message).join('; '),
          retryable: false,
        });
      }

      const targetNormalized = normalizeForMatch(expectedText);
      const matchedNode = (resp.data?.posts?.edges || [])
        .map((e) => e.node)
        .find((node) => node?.text && normalizeForMatch(node.text) === targetNormalized);

      if (matchedNode) {
        const mappedStatus = mapProviderStatus(matchedNode.status, 'addToQueue');
        return ok({
          success: mappedStatus !== 'failed',
          id: matchedNode.id,
          providerStatus: mappedStatus,
          scheduledAt: matchedNode.sentAt || matchedNode.dueAt,
          message: `Recovered post ${matchedNode.id} from Buffer channel history.`,
        });
      }

      return ok({
        success: false,
        providerStatus: 'failed',
        message: 'Post not found in Buffer channel history; safe to mark failed.',
      });
    } catch (error) {
      return err(classifyError(error));
    }
  }
}
