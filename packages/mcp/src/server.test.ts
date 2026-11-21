import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createXGrowthMcpServer } from './server.js';
import { XGrowthApiClient } from './client.js';

describe('XGrowth MCP Server & Antigravity Tool Suite', () => {
  let mockApiClient: XGrowthApiClient;
  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;

  beforeEach(async () => {
    mockApiClient = {
      getStatus: vi.fn().mockResolvedValue({
        globalPause: true,
        operationMode: 'review_everything',
        brandPillars: ['Software engineering', 'TypeScript & Node.js'],
        voiceTraits: ['Engineering rigor', 'No hype'],
        pendingReviewCount: 2,
        approvedCount: 1,
        submittedCount: 3,
      }),
      toggleEmergencyPause: vi.fn().mockImplementation((paused: boolean) =>
        Promise.resolve({ success: true, globalPause: paused }),
      ),
      getTopics: vi.fn().mockResolvedValue([
        {
          id: 'topic-1',
          title: 'Compiler Invariants in TypeScript',
          sourceName: 'Engineering Blog',
          sourceUrl: 'https://example.com/ts',
          summary: 'Type-level programming techniques',
          topicPillar: 'Software engineering',
          freshnessScore: 5,
          status: 'discovered',
        },
      ]),
      generateDrafts: vi.fn().mockResolvedValue({
        success: true,
        items: [
          {
            id: 'item-101',
            status: 'needs_review',
            format: 'single_post',
            text: 'Compile-time invariants eliminate entire classes of production bugs before deployment.',
            topicPillar: 'Software engineering',
            qualityFlags: ['Clear tone'],
            riskFlags: [],
          },
        ],
      }),
      listDrafts: vi.fn().mockResolvedValue([
        {
          id: 'item-101',
          status: 'needs_review',
          format: 'single_post',
          text: 'Draft post content',
          topicPillar: 'Software engineering',
          createdAt: new Date().toISOString(),
        },
      ]),
      approveDraft: vi.fn().mockResolvedValue({
        success: true,
        item: {
          id: 'item-101',
          status: 'approved',
          format: 'single_post',
          text: 'Draft post content',
          topicPillar: 'Software engineering',
          contentHash: 'hash-abc-123456',
          approval: {
            approvedBy: 'owner',
            approvedAt: new Date().toISOString(),
            approvedHash: 'hash-abc-123456',
          },
          createdAt: new Date().toISOString(),
        },
      }),
      submitToBuffer: vi.fn().mockResolvedValue({
        success: true,
        status: 'submitted_to_buffer',
        submissionId: 'buf-post-777',
        message: 'Post queued in Buffer.',
      }),
      reconcileStatus: vi.fn().mockResolvedValue({
        success: true,
        item: {
          id: 'item-101',
          status: 'queued',
          format: 'single_post',
          text: 'Draft post content',
          topicPillar: 'Software engineering',
          buffer: {
            channelId: 'chan-x-1',
            providerStatus: 'queued',
          },
          createdAt: new Date().toISOString(),
        },
      }),
      getWeeklyReport: vi.fn().mockResolvedValue({
        id: 'report-weekly-01',
        periodStart: '2026-11-14T00:00:00Z',
        periodEnd: '2026-11-21T00:00:00Z',
        markdownReport: '# Weekly X Content Report\n\n- Posts queued: 5\n- Top Pillar: Software engineering',
        whatWorked: ['Clean architectural posts'],
        whatNeedsTesting: ['Code snippets vs conceptual hooks'],
        nextExperiments: ['Publish build-in-public checklists'],
      }),
    } as unknown as XGrowthApiClient;

    const server = createXGrowthMcpServer(mockApiClient);
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);

    client = new Client({ name: 'antigravity-test-client', version: '0.1.0' });
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
  });

  it('registers all 9 expected XGrowth management tools', async () => {
    const listResult = await client.listTools();
    const toolNames = listResult.tools.map((t) => t.name);

    expect(toolNames).toContain('xgrowth_get_status');
    expect(toolNames).toContain('xgrowth_toggle_emergency_pause');
    expect(toolNames).toContain('xgrowth_research_topics');
    expect(toolNames).toContain('xgrowth_generate_draft');
    expect(toolNames).toContain('xgrowth_list_drafts');
    expect(toolNames).toContain('xgrowth_approve_draft');
    expect(toolNames).toContain('xgrowth_submit_to_buffer');
    expect(toolNames).toContain('xgrowth_reconcile_status');
    expect(toolNames).toContain('xgrowth_get_weekly_report');
    expect(toolNames.length).toBe(9);
  });

  it('executes xgrowth_get_status and returns system status payload', async () => {
    const res = await client.callTool({
      name: 'xgrowth_get_status',
      arguments: {},
    });

    expect(res.isError).toBeFalsy();
    const content = res.content as Array<{ type: string; text: string }>;
    const text = content[0]?.text ?? '';
    const parsed = JSON.parse(text);
    expect(parsed.globalPause).toBe(true);
    expect(parsed.operationMode).toBe('review_everything');
    expect(parsed.pendingReviewCount).toBe(2);
  });

  it('executes xgrowth_toggle_emergency_pause and updates state', async () => {
    const res = await client.callTool({
      name: 'xgrowth_toggle_emergency_pause',
      arguments: { paused: false },
    });

    expect(res.isError).toBeFalsy();
    const content = res.content as Array<{ type: string; text: string }>;
    const text = content[0]?.text ?? '';
    expect(text).toContain('DISABLED (Live Publishing Resumed)');
    expect(mockApiClient.toggleEmergencyPause).toHaveBeenCalledWith(false);
  });

  it('executes xgrowth_generate_draft with format and facts', async () => {
    const res = await client.callTool({
      name: 'xgrowth_generate_draft',
      arguments: {
        topic: 'Compile-time invariants',
        verifiedFacts: ['Guarantees valid transitions before runtime'],
        format: 'single_post',
      },
    });

    expect(res.isError).toBeFalsy();
    const content = res.content as Array<{ type: string; text: string }>;
    const text = content[0]?.text ?? '';
    const items = JSON.parse(text);
    expect(items.length).toBe(1);
    expect(items[0].id).toBe('item-101');
  });

  it('executes xgrowth_approve_draft and confirms approval hash', async () => {
    const res = await client.callTool({
      name: 'xgrowth_approve_draft',
      arguments: {
        contentItemId: 'item-101',
        channelId: 'buffer-chan-x-001',
      },
    });

    expect(res.isError).toBeFalsy();
    const content = res.content as Array<{ type: string; text: string }>;
    const text = content[0]?.text ?? '';
    expect(text).toContain("Status is now 'approved'");
    expect(text).toContain('hash-abc-123456');
  });

  it('executes xgrowth_submit_to_buffer and confirms submission response', async () => {
    const res = await client.callTool({
      name: 'xgrowth_submit_to_buffer',
      arguments: {
        contentItemId: 'item-101',
        channelId: 'buffer-chan-x-001',
        schedulingType: 'addToQueue',
      },
    });

    expect(res.isError).toBeFalsy();
    const content = res.content as Array<{ type: string; text: string }>;
    const text = content[0]?.text ?? '';
    expect(text).toContain('Successfully submitted to Buffer');
    expect(text).toContain('buf-post-777');
  });

  it('executes xgrowth_get_weekly_report and returns markdown report', async () => {
    const res = await client.callTool({
      name: 'xgrowth_get_weekly_report',
      arguments: {},
    });

    expect(res.isError).toBeFalsy();
    const content = res.content as Array<{ type: string; text: string }>;
    const text = content[0]?.text ?? '';
    expect(text).toContain('# Weekly X Content Report');
    expect(text).toContain('Top Pillar: Software engineering');
  });

  it('formats errors safely when client call fails', async () => {
    vi.spyOn(mockApiClient, 'getStatus').mockRejectedValueOnce(new Error('Connection refused'));

    const res = await client.callTool({
      name: 'xgrowth_get_status',
      arguments: {},
    });

    expect(res.isError).toBe(true);
    const content = res.content as Array<{ type: string; text: string }>;
    const text = content[0]?.text ?? '';
    expect(text).toContain('Failed to fetch status: Connection refused');
  });
});
