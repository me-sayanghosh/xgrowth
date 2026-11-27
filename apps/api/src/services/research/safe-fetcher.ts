import { URL } from 'url';
import dns from 'dns/promises';
import net from 'net';

export class SafeFetcher {
  private static readonly MAX_BYTES = 2 * 1024 * 1024; // 2 MB cap
  private static readonly MAX_REDIRECTS = 3;

  private static PRIVATE_IPV4_RANGES = [
    /^127\./, // Loopback
    /^10\./, // RFC 1918
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // RFC 1918
    /^192\.168\./, // RFC 1918
    /^169\.254\./, // Link-local / cloud metadata
    /^0\./, // "This" network
    /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./, // Shared CGNAT
  ];

  private static BLOCKED_HOSTNAMES = [
    /^localhost$/i,
    /\.localhost$/i,
    /\.local$/i,
    /\.internal$/i,
  ];

  public static isPrivateIp(rawIp: string): boolean {
    const ip = rawIp.replace(/^\[|\]$/g, '').toLowerCase();

    if (ip.startsWith('::ffff:')) {
      return this.isPrivateIp(ip.slice(7));
    }

    if (net.isIPv4(ip)) {
      return this.PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(ip));
    }

    if (net.isIPv6(ip)) {
      if (ip === '::1' || ip === '::') return true;
      if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // Unique local address fc00::/7
      if (ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) {
        return true; // Link-local fe80::/10
      }
      return false;
    }

    return true; // Unrecognized IP format treated as unsafe
  }

  private static isAlternateIpEncoding(hostname: string): boolean {
    // Reject hex (0x7f000001), pure integer (2130706433), or octal segments (0177.0.0.1)
    if (/^0x[0-9a-f]+$/i.test(hostname) || /^\d+$/.test(hostname)) {
      return true;
    }
    const parts = hostname.split('.');
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
      return parts.some((p) => p.length > 1 && p.startsWith('0'));
    }
    return false;
  }

  public static isSafeUrl(rawUrl: string): boolean {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }

      if (parsed.username || parsed.password) {
        return false;
      }

      const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
      if (!hostname) return false;

      if (this.BLOCKED_HOSTNAMES.some((pattern) => pattern.test(hostname))) {
        return false;
      }

      if (this.isAlternateIpEncoding(hostname)) {
        return false;
      }

      if (net.isIP(hostname) !== 0) {
        return !this.isPrivateIp(hostname);
      }

      return true;
    } catch {
      return false;
    }
  }

  public static async assertSafeResolvedUrl(rawUrl: string): Promise<void> {
    if (!this.isSafeUrl(rawUrl)) {
      throw new Error(`SSRF Blocked: URL '${rawUrl}' points to an untrusted or internal host.`);
    }

    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

    if (net.isIP(hostname) !== 0) {
      if (this.isPrivateIp(hostname)) {
        throw new Error(`SSRF Blocked: IP '${hostname}' is private or reserved.`);
      }
      return;
    }

    const resolved = await dns.lookup(hostname, { all: true }).catch(() => null);
    if (resolved && resolved.length > 0) {
      for (const record of resolved) {
        if (this.isPrivateIp(record.address)) {
          throw new Error(
            `SSRF Blocked: Host '${hostname}' resolved to private/internal IP '${record.address}'.`,
          );
        }
      }
    }
  }

  public static async fetchText(
    url: string,
    timeoutMs = 5000,
    maxBytes = SafeFetcher.MAX_BYTES,
    redirectsRemaining = SafeFetcher.MAX_REDIRECTS,
  ): Promise<string> {
    await this.assertSafeResolvedUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'XGrowth-Research-Bot/1.0 (+https://xgrowth.local)',
          Accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9',
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location || redirectsRemaining <= 0) {
          throw new Error(`SSRF/Redirect Blocked: Excessive or empty redirect from '${url}'.`);
        }
        const nextUrl = new URL(location, url).toString();
        return this.fetchText(nextUrl, timeoutMs, maxBytes, redirectsRemaining - 1);
      }

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      const contentLengthHeader = res.headers.get('content-length');
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > maxBytes) {
        throw new Error(`Response Too Large: exceeds ${maxBytes} bytes safety limit.`);
      }

      const text = await res.text();
      if (Buffer.byteLength(text, 'utf8') > maxBytes) {
        throw new Error(`Response Too Large: exceeds ${maxBytes} bytes safety limit.`);
      }

      return text;
    } finally {
      clearTimeout(timeout);
    }
  }
}
