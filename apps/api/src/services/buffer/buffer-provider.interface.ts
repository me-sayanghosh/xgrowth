import { BufferChannel, BufferPostInput, BufferPostResponse, Result } from '@xgrowth/shared';

export interface BufferProviderError {
  code: string;
  message: string;
  retryable: boolean;
  correlationId?: string;
  statusCode?: number;
}

export interface BufferProvider {
  name: string;
  listChannels(): Promise<Result<BufferChannel[], BufferProviderError>>;
  submitPost(input: BufferPostInput): Promise<Result<BufferPostResponse, BufferProviderError>>;
  getPostStatus(postId: string): Promise<Result<{ status: string; publishedAt?: string }, BufferProviderError>>;
  reconcileSubmission(
    submissionId: string,
    channelId: string,
    expectedText?: string,
  ): Promise<Result<BufferPostResponse, BufferProviderError>>;
}
