import { getEnv } from '@xgrowth/config';
import { BufferProvider } from './buffer-provider.interface.js';
import { BufferGraphQLProvider } from './buffer-graphql.provider.js';
import { MockBufferProvider } from './mock-buffer.provider.js';

export function createDefaultBufferProvider(): BufferProvider {
  const env = getEnv();
  const hasRealKey =
    Boolean(env.BUFFER_API_KEY) &&
    env.BUFFER_API_KEY !== 'mock-buffer-api-key' &&
    process.env.NODE_ENV !== 'test';

  return hasRealKey ? new BufferGraphQLProvider() : new MockBufferProvider();
}
