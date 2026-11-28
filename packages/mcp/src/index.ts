#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createXGrowthMcpServer } from './server.js';
import { XGrowthClientLike } from './client.js';
import { LocalXGrowthClient } from './local/local-client.js';

export * from './client.js';
export * from './server.js';
export * from './local/local-client.js';
export * from './local/local-store.js';
export * from './local/workflow.service.js';
export * from './local/buffer-client.js';
export * from './local/local-publisher.js';

export function createDefaultClient(): XGrowthClientLike {
  return new LocalXGrowthClient();
}

export async function runServer(): Promise<void> {
  const server = createXGrowthMcpServer(createDefaultClient());
  const transport = new StdioServerTransport();

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });

  await server.connect(transport);
}

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  runServer().catch((err) => {
    console.error('[XGrowth MCP Server Fatal Error]', err);
    process.exit(1);
  });
}
