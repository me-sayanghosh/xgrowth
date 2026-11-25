import { BufferChannel } from '@xgrowth/shared';
import { BufferProvider } from './buffer-provider.interface.js';
import { createDefaultBufferProvider } from './buffer-provider.factory.js';

export class ChannelDiscoveryService {
  private static cachedChannels: BufferChannel[] | null = null;
  private static cacheExpiry = 0;
  private static CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache to avoid rate limits

  public static async listXChannels(provider?: BufferProvider): Promise<BufferChannel[]> {
    const now = Date.now();
    if (!provider && this.cachedChannels && now < this.cacheExpiry) {
      return this.cachedChannels;
    }

    const activeProvider = provider || createDefaultBufferProvider();
    const res = await activeProvider.listChannels();
    if (!res.ok) {
      if (provider) {
        throw new Error(res.error.message);
      }
      return [];
    }

    const xChannels = res.value.filter((c) => c.service === 'x' || c.service === 'twitter');
    this.cachedChannels = xChannels;
    this.cacheExpiry = now + this.CACHE_TTL_MS;
    return xChannels;
  }

  public static clearCache(): void {
    this.cachedChannels = null;
    this.cacheExpiry = 0;
  }
}
