import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { getEnv, getRepoRoot } from '@xgrowth/config';
import {
  AuditEvent,
  auditEventSchema,
  LocalContentItem,
  localContentItemSchema,
  LocalQuota,
  localQuotaSchema,
  LocalSettings,
  localSettingsSchema,
  LocalTopic,
  localTopicSchema,
  ReferenceAccount,
  referenceAccountSchema,
} from '@xgrowth/shared';

function redactSecrets(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
      .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]');
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (/token|secret|apikey|api_key|password|authorization/i.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSecrets(v);
      }
    }
    return out;
  }
  return value;
}

/**
 * Atomic JSON / JSONL local persistence store requiring no external database.
 */
export class LocalStore {
  public readonly dataDir: string;

  constructor(dataDir?: string) {
    const env = getEnv();
    const configuredDir = dataDir || env.XGROWTH_DATA_DIR || process.env.XGROWTH_DATA_DIR;
    this.dataDir = configuredDir ? path.resolve(configuredDir) : path.resolve(getRepoRoot(), 'data');
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private filePath(name: string): string {
    return path.join(this.dataDir, name);
  }

  private readJson<T>(fileName: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, fallback: () => T): T {
    this.ensureDir();
    const target = this.filePath(fileName);
    if (!fs.existsSync(target)) {
      const initial = fallback();
      this.writeJson(fileName, initial);
      return initial;
    }

    const raw = fs.readFileSync(target, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return schema.parse(parsed);
  }

  private writeJson(fileName: string, data: unknown): void {
    this.ensureDir();
    const target = this.filePath(fileName);
    const tmp = `${target}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmp, target);
  }

  public getSettings(): LocalSettings {
    return this.readJson('settings.json', localSettingsSchema, () => localSettingsSchema.parse({}));
  }

  public saveSettings(settings: LocalSettings): LocalSettings {
    const validated = localSettingsSchema.parse(settings);
    this.writeJson('settings.json', validated);
    return validated;
  }

  public getDrafts(): LocalContentItem[] {
    return this.readJson('drafts.json', z.array(localContentItemSchema), () => []);
  }

  public saveDrafts(drafts: LocalContentItem[]): LocalContentItem[] {
    const validated = z.array(localContentItemSchema).parse(drafts);
    this.writeJson('drafts.json', validated);
    return validated;
  }

  public getReferences(): ReferenceAccount[] {
    return this.readJson('references.json', z.array(referenceAccountSchema), () => []);
  }

  public saveReferences(refs: ReferenceAccount[]): ReferenceAccount[] {
    const validated = z.array(referenceAccountSchema).parse(refs);
    this.writeJson('references.json', validated);
    return validated;
  }

  public getTopics(): LocalTopic[] {
    return this.readJson('topics.json', z.array(localTopicSchema), () => []);
  }

  public saveTopics(topics: LocalTopic[]): LocalTopic[] {
    const validated = z.array(localTopicSchema).parse(topics);
    this.writeJson('topics.json', validated);
    return validated;
  }

  public getQuota(): LocalQuota {
    const now = new Date();
    const reset = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.readJson('quota.json', localQuotaSchema, () =>
      localQuotaSchema.parse({
        monthlyLimit: 1000,
        usageCount: 0,
        cycleStartDate: now.toISOString(),
        cycleResetDate: reset.toISOString(),
      }),
    );
  }

  public saveQuota(quota: LocalQuota): LocalQuota {
    const now = new Date();
    let current = quota;
    if (new Date(current.cycleResetDate) <= now) {
      current = {
        monthlyLimit: current.monthlyLimit,
        usageCount: 0,
        cycleStartDate: now.toISOString(),
        cycleResetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
    const validated = localQuotaSchema.parse(current);
    this.writeJson('quota.json', validated);
    return validated;
  }

  public incrementQuota(count = 1): LocalQuota {
    const current = this.getQuota();
    return this.saveQuota({
      ...current,
      usageCount: current.usageCount + count,
    });
  }

  public appendAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    this.ensureDir();
    const fullEvent = auditEventSchema.parse({
      ...event,
      id: `audit-${crypto.randomUUID()}`,
      metadata: redactSecrets(event.metadata || {}) as Record<string, unknown>,
      timestamp: new Date().toISOString(),
    });
    fs.appendFileSync(this.filePath('audit.jsonl'), `${JSON.stringify(fullEvent)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    return fullEvent;
  }

  public readAuditEvents(limit = 100): AuditEvent[] {
    const target = this.filePath('audit.jsonl');
    if (!fs.existsSync(target)) {
      return [];
    }
    const lines = fs
      .readFileSync(target, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    return lines
      .slice(-limit)
      .map((line) => auditEventSchema.parse(JSON.parse(line)))
      .reverse();
  }
}
