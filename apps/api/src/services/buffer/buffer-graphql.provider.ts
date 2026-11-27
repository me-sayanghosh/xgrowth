import {
  BufferChannel,
  BufferPostInput,
  BufferPostResponse,
  Result,
  ok,
  err,
} from '@xgrowth/shared';
import { BufferProvider, BufferProviderError } from './buffer-provider.interface.js';
import { BufferGraphQLClient } from './buffer-graphql.client.js';

interface ChannelsQueryData {
  account?: {
    organizations?: Array<{
      id?: string;
      channels?: Array<{
        id: string;
        name: string;
        service: string;
        avatar?: string;
        isQueuePaused?: boolean;
        timezone?: string;
      }>;
    }>;
  };
}

interface CreatePostMutationData {
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

interface GetPostQueryData {
  post?: {
    id: string;
    status?: string;
    dueAt?: string;
    sentAt?: string;
    text?: string;
  } | null;
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

function classifyError(error: unknown): BufferProviderError {
  const errObj = error instanceof Error ? error : new Error(String(error));
  const msg = errObj.message;

  if (errObj.name === 'AbortError' || msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('timeout')) {
    return {
      code: 'REQUEST_TIMEOUT',
      message: `Buffer API request timed out: ${msg}`,
      retryable: false, // Ambiguous timeout must NOT be blindly retried
    };
  }

  const httpMatch = msg.match(/Buffer API HTTP (\d+):/);
  const statusCode = httpMatch?.[1] ? parseInt(httpMatch[1], 10) : undefined;

  if (statusCode === 401 || statusCode === 403) {
    return {
      code: 'BUFFER_AUTH_FAILED',
      message: msg,
      retryable: false,
      statusCode,
    };
  }

  if (statusCode === 429) {
    return {
      code: 'BUFFER_RATE_LIMITED',
      message: msg,
      retryable: true,
      statusCode,
    };
  }

  return {
    code: 'BUFFER_API_ERROR',
    message: msg,
    retryable: statusCode !== undefined && statusCode >= 500,
    statusCode,
  };
}

interface ChannelPostsQueryData {
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

function normalizeForMatch(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

export class BufferGraphQLProvider implements BufferProvider {
  public readonly name = 'buffer_graphql';

  public async listChannels(): Promise<Result<BufferChannel[], BufferProviderError>> {
    const query = `
      query GetChannels {
        account {
          organizations {
            id
            channels {
              id
              name
              service
              avatar
              isQueuePaused
              timezone
            }
          }
        }
      }
    `;

    try {
      const resp = await BufferGraphQLClient.execute<ChannelsQueryData>({ query });
      if (resp.errors && resp.errors.length > 0) {
        return err({
          code: 'BUFFER_GRAPHQL_ERROR',
          message: resp.errors.map((e) => e.message).join('; '),
          retryable: false,
        });
      }

      const channels: BufferChannel[] = [];
      for (const org of resp.data?.account?.organizations || []) {
        for (const ch of org.channels || []) {
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

  public async submitPost(input: BufferPostInput): Promise<Result<BufferPostResponse, BufferProviderError>> {
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

    if (input.mediaUrls && input.mediaUrls.length > 0) {
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
      const resp = await BufferGraphQLClient.execute<CreatePostMutationData>({
        query: mutation,
        variables: { input: createInput },
      });

      if (resp.errors && resp.errors.length > 0) {
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
  ): Promise<Result<{ status: string; publishedAt?: string }, BufferProviderError>> {
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
      const resp = await BufferGraphQLClient.execute<GetPostQueryData>({
        query,
        variables: { input: { id: postId } },
      });

      if (resp.errors && resp.errors.length > 0) {
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

      const normalized = mapProviderStatus(post.status, 'addToQueue');
      return ok({
        status: normalized,
        publishedAt: post.sentAt || post.dueAt,
      });
    } catch (error) {
      return err(classifyError(error));
    }
  }

  public async reconcileSubmission(
    submissionId: string,
    channelId: string,
    expectedText?: string,
  ): Promise<Result<BufferPostResponse, BufferProviderError>> {
    const looksLikeIdempotencyKey = /^[a-f0-9]{64}$/i.test(submissionId) || !submissionId;

    if (!looksLikeIdempotencyKey) {
      const statusRes = await this.getPostStatus(submissionId);
      if (statusRes.ok) {
        const mappedStatus =
          statusRes.value.status === 'published'
            ? 'published'
            : statusRes.value.status === 'scheduled'
            ? 'scheduled'
            : statusRes.value.status === 'failed'
            ? 'failed'
            : 'queued';

        return ok({
          success: mappedStatus !== 'failed',
          id: submissionId,
          providerStatus: mappedStatus,
          scheduledAt: statusRes.value.publishedAt,
          message: `Reconciled via Buffer GraphQL API (status: ${mappedStatus}).`,
        });
      }
      if (!expectedText) {
        return err(statusRes.error);
      }
    }

    // Fallback for ambiguous timeout where no providerPostId was returned: inspect recent channel posts
    if (!expectedText) {
      return err({
        code: 'MISSING_RECONCILIATION_CONTEXT',
        message: 'Cannot reconcile without a Buffer post ID or expected post text.',
        retryable: false,
      });
    }

    const channelsRes = await this.listChannels();
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
      const resp = await BufferGraphQLClient.execute<ChannelPostsQueryData>({
        query: postsQuery,
        variables: {
          input: {
            organizationId,
            filter: { channelIds: [channelId] },
          },
        },
      });

      if (resp.errors && resp.errors.length > 0) {
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
