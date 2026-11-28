import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createXGrowthMcpServer } from '../server.js';
import { LocalXGrowthClient } from './local-client.js';
import { runCli } from '../cli.js';

describe('LocalXGrowthClient + MCP Server + CLI End-to-End', () => {
  let tmpDir: string;
  let localClient: LocalXGrowthClient;
  let mcpClient: Client;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xgrowth-e2e-local-'));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          createPost: {
            __typename: 'PostActionSuccess',
            post: { id: 'buf-live-55', text: 'Shipped local mode.', status: 'queued' },
          },
        },
      }),
    });

    localClient = new LocalXGrowthClient({
      dataDir: tmpDir,
      bufferApiKey: 'test-buffer-key',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const server = createXGrowthMcpServer(localClient);
    const [cTransport, sTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(sTransport);

    mcpClient = new Client({ name: 'vscode-or-antigravity-client', version: '1.0.0' });
    await mcpClient.connect(cTransport);
  });

  afterEach(async () => {
    await mcpClient.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('executes full zero-DB agent workflow via MCP tools (reference -> draft -> approve -> unpause -> Buffer)', async () => {
    await mcpClient.callTool({
      name: 'xgrowth_save_reference_account',
      arguments: {
        handle: '@builder_ref',
        styleTraits: ['Short real-world engineering lessons'],
        samplePosts: ['Removed 2 databases and cut latency by 40%.'],
      },
    });

    const styleRes = await mcpClient.readResource({ uri: 'xgrowth://style-profile' });
    expect((styleRes.contents[0] as { text: string }).text).toContain('@builder_ref');

    const createdRes = await mcpClient.callTool({
      name: 'xgrowth_create_draft',
      arguments: {
        text: 'Replaced MongoDB + Express with a local JSON store and MCP bridge for solo publishing.',
        format: 'build_in_public',
        topicPillar: 'AI Engineering & Agentic Systems',
      },
    });
    const createdDraft = JSON.parse((createdRes.content as Array<{ text: string }>)[0]!.text);
    expect(createdDraft.status).toBe('needs_review');

    await mcpClient.callTool({
      name: 'xgrowth_approve_draft',
      arguments: {
        contentItemId: createdDraft.id,
        channelId: '6b0a71868541f09ecbcf17c8',
      },
    });

    await mcpClient.callTool({
      name: 'xgrowth_toggle_emergency_pause',
      arguments: { paused: false },
    });

    const submitRes = await mcpClient.callTool({
      name: 'xgrowth_submit_to_buffer',
      arguments: {
        contentItemId: createdDraft.id,
        channelId: '6b0a71868541f09ecbcf17c8',
      },
    });
    expect((submitRes.content as Array<{ text: string }>)[0]!.text).toContain('buf-live-55');
  });

  it('supports VS Code terminal CLI commands cleanly', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await runCli(['ref', 'add', '--handle', '@cli_ref', '--traits', 'concise,technical'], localClient);
    await runCli(['draft', 'create', '--text', 'CLI created draft for VS Code testing.', '--pillar', 'TypeScript'], localClient);
    await runCli(['status'], localClient);

    const output = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(output).toContain('@cli_ref');
    expect(output).toContain('pendingReviewCount');
  });
});
