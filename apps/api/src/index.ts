/**
 * @xgrowth/api - Express Backend Application Entrypoint
 */

import { getEnv } from '@xgrowth/config';

const env = getEnv();

console.log(`Starting XGrowth AI API in ${env.NODE_ENV} mode...`);

export function bootstrap() {
  return { status: 'ready', env: env.NODE_ENV };
}
