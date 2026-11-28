import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContentFormatEnum, ContentStatusEnum } from '@xgrowth/shared';
import { LocalStore } from './local-store.js';
import { LocalWorkflowService } from './workflow.service.js';

describe('LocalStore & LocalWorkflowService', () => {
  let tmpDir: string;
  let store: LocalStore;
  let workflow: LocalWorkflowService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xgrowth-local-test-'));
    store = new LocalStore(tmpDir);
    workflow = new LocalWorkflowService(store);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('defaults globalPause to true and toggles emergency pause with audit trail', () => {
    const initial = workflow.getStatus();
    expect(initial.globalPause).toBe(true);

    const resumed = workflow.toggleEmergencyPause(false, 'owner');
    expect(resumed.globalPause).toBe(false);

    const events = store.readAuditEvents();
    expect(events[0]?.action).toBe('PAUSE_TOGGLED');
  });

  it('creates draft with 280-char validation and tone linting, approves with hash, and invalidates approval on edit', () => {
    const draft = workflow.createDraft({
      text: 'Explicit boundaries between modules keep systems easy to change.',
      format: ContentFormatEnum.SINGLE_POST,
      topicPillar: 'Software engineering',
    });

    expect(draft.status).toBe(ContentStatusEnum.NEEDS_REVIEW);
    expect(draft.riskFlags).toEqual([]);

    const approved = workflow.approveDraft(draft.id, 'chan-x-1', 'owner');
    expect(approved.status).toBe(ContentStatusEnum.APPROVED);
    expect(approved.approval?.approvedHash).toHaveLength(64);
    expect(approved.buffer?.channelId).toBe('chan-x-1');

    const edited = workflow.editDraft(draft.id, {
      text: 'This game-changer framework will revolutionize everything!',
    });
    expect(edited.status).toBe(ContentStatusEnum.NEEDS_REVIEW);
    expect(edited.approval).toBeNull();
    expect(edited.contentHash).toBeUndefined();
    expect(edited.riskFlags?.length).toBeGreaterThan(0);

    const actions = store.readAuditEvents().map((e) => e.action);
    expect(actions).toContain('APPROVAL_INVALIDATED');
    expect(actions).toContain('APPROVAL_GRANTED');
  });

  it('manages reference accounts and sample post styles locally', () => {
    const saved = workflow.saveReferenceAccount({
      handle: 'SayanRef',
      styleTraits: ['Concise trade-offs', 'No buzzwords'],
      postArchetypes: ['educational_tip'],
      samplePosts: ['Why idempotency keys matter before retrying HTTP mutations.'],
      topics: ['Backend architecture'],
    });

    expect(saved.handle).toBe('@SayanRef');
    expect(workflow.listReferenceAccounts()).toHaveLength(1);

    const updated = workflow.saveReferenceAccount({
      handle: '@SayanRef',
      notes: 'Great hooks on Node.js internals',
    });
    expect(updated.notes).toBe('Great hooks on Node.js internals');
    expect(workflow.listReferenceAccounts()).toHaveLength(1);

    expect(workflow.deleteReferenceAccount('@SayanRef')).toBe(true);
    expect(workflow.listReferenceAccounts()).toHaveLength(0);
  });
});
