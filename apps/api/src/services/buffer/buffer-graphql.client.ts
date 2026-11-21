import { getEnv } from '@xgrowth/config';

export interface GraphQLRequestOptions {
  query: string;
  variables?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; locations?: unknown[]; path?: string[] }>;
}

export class BufferGraphQLClient {
  public static readonly ENDPOINT = 'https://api.buffer.com';

  public static async execute<T>(options: GraphQLRequestOptions): Promise<GraphQLResponse<T>> {
    const env = getEnv();
    const apiKey = env.BUFFER_API_KEY;

    if (!apiKey) {
      throw new Error('BUFFER_API_KEY is not configured in server environment.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 10000);

    try {
      const response = await fetch(this.ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'User-Agent': 'XGrowth-AI/1.0',
        },
        body: JSON.stringify({
          query: options.query,
          variables: options.variables || {},
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Buffer API HTTP ${response.status}: ${errorText}`);
      }

      const json = (await response.json()) as GraphQLResponse<T>;
      return json;
    } finally {
      clearTimeout(timeout);
    }
  }
}
