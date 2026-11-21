import express, { Express } from 'express';
import http from 'http';
import { getEnv } from '@xgrowth/config';
import { dbConnection } from './db/connection.js';

export class AppServer {
  public app: Express;
  public server: http.Server | null = null;

  constructor() {
    this.app = express();
    this.configureBaseMiddlewares();
  }

  private configureBaseMiddlewares(): void {
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  }

  public async start(): Promise<http.Server> {
    const env = getEnv();
    await dbConnection.connect({ uri: env.MONGODB_URI });

    return new Promise((resolve) => {
      this.server = this.app.listen(env.PORT, () => {
        console.log(`XGrowth AI API listening on port ${env.PORT} in ${env.NODE_ENV} mode.`);
        resolve(this.server!);
      });
    });
  }

  public async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      this.server = null;
    }
    await dbConnection.disconnect();
  }
}

export function createExpressApp(): Express {
  const appServer = new AppServer();
  return appServer.app;
}
