#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createXGrowthMcpServer } from './server.js';
import { XGrowthApiClient } from './client.js';

export * from './client.js';
export * from './server.js';

export async function runServer(): Promise<void> {
  const server = createXGrowthMcpServer(new XGrowthApiClient());
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

// Auto-run when executed directly as CLI script
if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  runServer().catch((err) => {
    console.error('[XGrowth MCP Server Fatal Error]', err);
    process.exit(1);
  });
}
