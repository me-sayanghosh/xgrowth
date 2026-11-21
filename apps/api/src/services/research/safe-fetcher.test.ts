import { describe, it, expect } from 'vitest';
import { SafeFetcher } from './safe-fetcher.js';

describe('SafeFetcher', () => {
  it('blocks private IPv4 addresses and localhost (SSRF protection)', () => {
    expect(SafeFetcher.isSafeUrl('http://127.0.0.1:8080/admin')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://localhost:3000/api')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://10.0.0.1/secret')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://192.168.1.1/router')).toBe(false);
    expect(SafeFetcher.isSafeUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
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
});
