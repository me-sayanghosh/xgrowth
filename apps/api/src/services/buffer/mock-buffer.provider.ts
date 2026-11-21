import { BufferProvider, BufferProviderError } from './buffer-provider.interface.js';
import { BufferChannel, BufferPostInput, BufferPostResponse, Result, ok, err } from '@xgrowth/shared';

export class MockBufferProvider implements BufferProvider {
  public readonly name = 'mock_buffer';
  public shouldSimulateTimeout = false;
  public shouldSimulateError = false;

  private mockChannels: BufferChannel[] = [
    {
      id: 'mock-channel-x-01',
      name: 'Developer Persona (@dev_builder)',
      service: 'x',
      avatar: 'https://example.com/avatar.jpg',
      isQueuePaused: false,
      timezone: 'Asia/Kolkata',
    },
  ];

  public async listChannels(): Promise<Result<BufferChannel[], BufferProviderError>> {
    if (this.shouldSimulateError) {
      return err({
        code: 'BUFFER_AUTH_FAILED',
        message: 'Invalid personal API key provided.',
        retryable: false,
        statusCode: 401,
      });
    }

    return ok(this.mockChannels);
  }

  public async submitPost(input: BufferPostInput): Promise<Result<BufferPostResponse, BufferProviderError>> {
    if (this.shouldSimulateTimeout) {
      return err({
        code: 'REQUEST_TIMEOUT',
        message: 'Mock socket timeout occurred after request dispatch.',
        retryable: false, // ambiguous timeout must NOT be blindly retried
      });
    }

    if (this.shouldSimulateError) {
      return err({
        code: 'BUFFER_MUTATION_FAILED',
        message: 'Channel queue is full or account suspended.',
        retryable: false,
      });
    }

    return ok({
      success: true,
      id: `buf-post-${Date.now()}`,
      providerStatus: 'queued',
      scheduledAt: input.dueAt || new Date(Date.now() + 3600000).toISOString(),
      message: 'Post successfully added to Buffer queue.',
      correlationId: `corr-${input.idempotencyKey.slice(0, 8)}`,
    });
  }

  public async getPostStatus(_postId: string): Promise<Result<{ status: string; publishedAt?: string }, BufferProviderError>> {
    return ok({
      status: 'queued',
    });
  }

  public async reconcileSubmission(submissionId: string, _channelId: string): Promise<Result<BufferPostResponse, BufferProviderError>> {
    return ok({
      success: true,
      id: submissionId,
      providerStatus: 'queued',
      message: 'Reconciled successfully via mock channel history.',
    });
  }
}
