import { URL } from 'url';

export class SafeFetcher {
  private static PRIVATE_IP_RANGES = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./, // AWS/cloud link-local metadata
    /^0\./,
    /^localhost$/i,
  ];

  public static isSafeUrl(rawUrl: string): boolean {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }

      const hostname = parsed.hostname;
      if (this.PRIVATE_IP_RANGES.some((pattern) => pattern.test(hostname))) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  public static async fetchText(url: string, timeoutMs = 5000): Promise<string> {
    if (!this.isSafeUrl(url)) {
      throw new Error(`SSRF Blocked: URL '${url}' points to an untrusted or internal host.`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'XGrowth-Research-Bot/1.0 (+https://xgrowth.local)',
          Accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      return await res.text();
    } finally {
      clearTimeout(timeout);
    }
  }
}
