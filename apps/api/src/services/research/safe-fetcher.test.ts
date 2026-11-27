import { describe, it, expect, vi, afterEach } from 'vitest';
import dns from 'dns/promises';
import { SafeFetcher } from './safe-fetcher.js';

describe('SafeFetcher', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks private IPv4, IPv6, metadata, and alternate IP encodings (SSRF protection)', () => {
    expect(SafeFetcher.isSafeUrl('http://127.0.0.1:8080/admin')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://localhost:3000/api')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://app.internal/metrics')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://printer.local/status')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://10.0.0.1/secret')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://192.168.1.1/router')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://[::1]:8080/')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://[fe80::1]/')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://[::ffff:127.0.0.1]/')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://0x7f000001/')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://2130706433/')).toBe(false);
    expect(SafeFetcher.isSafeUrl('https://user:pass@example.com/feed')).toBe(false);
  });

  it('allows public HTTPS web addresses', () => {
    expect(SafeFetcher.isSafeUrl('https://api.github.com/repos')).toBe(true);
    expect(SafeFetcher.isSafeUrl('https://developer.mozilla.org/')).toBe(true);
  });

  it('rejects unsupported protocols', () => {
    expect(SafeFetcher.isSafeUrl('ftp://example.com/file')).toBe(false);
    expect(SafeFetcher.isSafeUrl('file:///etc/passwd')).toBe(false);
    expect(SafeFetcher.isSafeUrl('gopher://example.com')).toBe(false);
  });

  it('blocks DNS rebinding when a public domain resolves to a private IP', async () => {
    vi.spyOn(dns, 'lookup').mockResolvedValueOnce([
      { address: '127.0.0.1', family: 4 },
    ] as any);

    await expect(SafeFetcher.fetchText('https://rebind.evil.test/feed.xml')).rejects.toThrow(
      /SSRF Blocked.*private\/internal IP/,
    );
  });

  it('validates redirect targets and blocks redirects into internal hosts', async () => {
    vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data/' },
      }),
    );

    await expect(SafeFetcher.fetchText('https://example.com/redirect-ssrf')).rejects.toThrow(
      /SSRF Blocked/,
    );
  });
});
