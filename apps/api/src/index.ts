/**
 * @xgrowth/api - Express Backend Application Entrypoint
 */

import { pathToFileURL } from 'url';
import { getEnv } from '@xgrowth/config';
import { AppServer } from './server.js';

export async function bootstrap(): Promise<AppServer> {
  const env = getEnv();
  console.log(`Starting XGrowth AI API in ${env.NODE_ENV} mode...`);

  const server = new AppServer();
  await server.start();

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down XGrowth AI API gracefully...`);
    await server.stop();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  return server;
}

const isDirectExecution =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  bootstrap().catch((err) => {
    console.error('Fatal error starting XGrowth AI API:', err);
    process.exit(1);
  });
}
