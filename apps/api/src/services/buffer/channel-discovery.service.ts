import { BufferChannel } from '@xgrowth/shared';
import { BufferProvider } from './buffer-provider.interface.js';
import { MockBufferProvider } from './mock-buffer.provider.js';
import { getEnv } from '@xgrowth/config';
import { BufferGraphQLClient } from './buffer-graphql.client.js';

interface GraphqlAccountQuery {
  account?: {
    organizations?: Array<{
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

export class ChannelDiscoveryService {
  private static cachedChannels: BufferChannel[] | null = null;
  private static cacheExpiry = 0;
  private static CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache to avoid rate limits

  public static async listXChannels(provider?: BufferProvider): Promise<BufferChannel[]> {
    const now = Date.now();
    if (this.cachedChannels && now < this.cacheExpiry) {
      return this.cachedChannels;
    }

    if (provider) {
      const res = await provider.listChannels();
      if (!res.ok) throw new Error(res.error.message);
      this.cachedChannels = res.value.filter((c) => c.service === 'x' || c.service === 'twitter');
      this.cacheExpiry = now + this.CACHE_TTL_MS;
      return this.cachedChannels;
    }

    const env = getEnv();
    if (!env.BUFFER_API_KEY) {
      const mock = new MockBufferProvider();
      const res = await mock.listChannels();
      return (res as { value: BufferChannel[] }).value;
    }

    try {
      const query = `
        query GetChannels {
          account {
            organizations {
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

      const resp = await BufferGraphQLClient.execute<GraphqlAccountQuery>({ query });
      const channels: BufferChannel[] = [];

      for (const org of resp.data?.account?.organizations || []) {
        for (const ch of org.channels || []) {
          if (ch.service === 'x' || ch.service === 'twitter') {
            channels.push({
              id: ch.id,
              name: ch.name,
              service: ch.service,
              avatar: ch.avatar,
              isQueuePaused: ch.isQueuePaused || false,
              timezone: ch.timezone || 'UTC',
            });
          }
        }
      }

      this.cachedChannels = channels;
      this.cacheExpiry = now + this.CACHE_TTL_MS;
      return channels;
    } catch (err) {
      // Fallback to empty if real API fails or invalid key
      return [];
    }
  }

  public static clearCache(): void {
    this.cachedChannels = null;
    this.cacheExpiry = 0;
  }
}
