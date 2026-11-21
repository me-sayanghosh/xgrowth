import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import pino from 'pino';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { correlationMiddleware } from '../../src/middlewares/correlation.js';
import { csrfProtection } from '../../src/middlewares/csrf.js';
import { SafeFetcher } from '../../src/services/research/safe-fetcher.js';
import { ToneLinter } from '../../src/services/ai/tone-linter.js';

describe('Security Hardening & Token Leakage Regression Suite', () => {
  it('verifies Pino logger redacts bearer tokens and api keys from log output', () => {
    let capturedLog = '';
    const destinationStream = {
      write(chunk: string) {
        capturedLog += chunk;
      },
    };

    const auditLogger = pino(
      {
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-buffer-api-key"]',
            'res.headers["set-cookie"]',
            'token',
            '*.token',
            'apiKey',
            '*.apiKey',
            'password',
            '*.password',
            'bufferApiKey',
            '*.bufferApiKey',
            'geminiApiKey',
            '*.geminiApiKey',
          ],
          censor: '[REDACTED]',
        },
      },
      destinationStream,
    );

    auditLogger.info({
      token: 'secret-token-xyz-12345678',
      geminiApiKey: 'AIzaSySecretGeminiKey999',
      bufferApiKey: 'buf-sec-abcdef123456',
      req: {
        headers: {
          authorization: 'Bearer sk-super-secret-user-credential',
          'x-buffer-api-key': 'buf-raw-key-777',
        },
      },
      normalField: 'safe-public-data',
    });

    expect(capturedLog).not.toContain('secret-token-xyz-12345678');
    expect(capturedLog).not.toContain('AIzaSySecretGeminiKey999');
    expect(capturedLog).not.toContain('buf-sec-abcdef123456');
    expect(capturedLog).not.toContain('sk-super-secret-user-credential');
    expect(capturedLog).not.toContain('buf-raw-key-777');
    expect(capturedLog).toContain('[REDACTED]');
    expect(capturedLog).toContain('safe-public-data');
  });

  it('verifies error handler never echoes internal stack traces or secrets to client', async () => {
    const app = express();
    app.use(correlationMiddleware);
    app.use(express.json());

    app.get('/api/test-leakage', (req, _res, next) => {
      const token = req.headers.authorization || 'unknown';
      const err = new Error(`Database connection failed: internal details with ${token}`);
      (err as unknown as { status: number }).status = 502;
      next(err);
    });

    app.use(errorHandler);

    const res = await request(app)
      .get('/api/test-leakage')
      .set('Authorization', 'Bearer sensitive-auth-token-12345');

    expect(res.status).toBe(502);
    expect(res.body.correlationId).toBeDefined();
    expect(res.body).not.toHaveProperty('stack');
  });

  it('verifies SafeFetcher rejects SSRF attempts to private and loopback networks', async () => {
    const ssrfTargets = [
      'http://127.0.0.1/metrics',
      'http://localhost:8080/admin',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.0.0.1/internal-api',
      'http://192.168.1.1/router-config',
      'ftp://malicious-protocol.com/data',
    ];

    for (const url of ssrfTargets) {
      expect(SafeFetcher.isSafeUrl(url)).toBe(false);
      await expect(SafeFetcher.fetchText(url)).rejects.toThrow(/SSRF Blocked/);
    }
  });

  it('verifies CSRF protection blocks unauthorized mutation requests without csrf header', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const app = express();
      app.use(csrfProtection);
      app.post('/api/test-mutation', (_req, res) => {
        res.json({ ok: true });
      });
      app.use(errorHandler);

      // Missing x-xgrowth-csrf
      const resNoCsrf = await request(app).post('/api/test-mutation').send({ data: 1 });
      expect(resNoCsrf.status).toBe(403);
      expect(resNoCsrf.body.error).toBe('CSRF_BLOCKED');

      // Present x-xgrowth-csrf
      const resWithCsrf = await request(app)
        .post('/api/test-mutation')
        .set('x-xgrowth-csrf', '1')
        .send({ data: 1 });
      expect(resWithCsrf.status).toBe(200);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('verifies ToneLinter flags hype phrases, hashtag stuffing, and engagement bait', () => {
    const maliciousPost =
      'This game-changer tool will revolutionize your workflow! #crypto #growth #viral #tech #dev #ai Like and retweet to save a life.';
    const lint = ToneLinter.lintDraft(maliciousPost);

    expect(lint.passed).toBe(false);
    expect(lint.riskFlags.some((i) => i.includes('game-changer'))).toBe(true);
    expect(lint.riskFlags.some((i) => i.includes('Hashtag stuffing'))).toBe(true);
    expect(lint.riskFlags.some((i) => i.includes('Engagement bait'))).toBe(true);
  });
});
