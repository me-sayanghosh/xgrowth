import express, { Express } from 'express';
import http from 'http';
import { getEnv } from '@xgrowth/config';
import { dbConnection } from './db/connection.js';
import { correlationMiddleware } from './middlewares/correlation.js';
import { requestLogger } from './middlewares/logger.js';
import { errorHandler } from './middlewares/error-handler.js';
import { configureSecurityMiddlewares } from './middlewares/security.js';
import { healthRouter } from './routes/health.router.js';
import { settingsRouter } from './routes/settings.router.js';
import { auditRouter } from './routes/audit.router.js';
import { researchRouter } from './routes/research.router.js';
import { contentGenerateRouter } from './routes/content-generate.router.js';
import { contentItemRouter } from './routes/content-item.router.js';
import { calendarRouter } from './routes/calendar.router.js';
import { bufferRouter } from './routes/buffer.router.js';
import { analyticsRouter } from './routes/analytics.router.js';
import { jobsRouter } from './routes/jobs.router.js';
import { SchedulerService } from './services/scheduler/scheduler.service.js';
import { SettingsService } from './services/settings.service.js';
import { BufferQuotaTracker } from './services/buffer/rate-limiter.js';

export class AppServer {
  public app: Express;
  public server: http.Server | null = null;

  constructor() {
    this.app = express();
    this.configureBaseMiddlewares();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureBaseMiddlewares(): void {
    for (const mw of configureSecurityMiddlewares()) {
      this.app.use(mw);
    }
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    this.app.use(correlationMiddleware);
    this.app.use(requestLogger);
  }

  private configureRoutes(): void {
    this.app.use('/api', healthRouter);
    this.app.use('/api/settings', settingsRouter);
    this.app.use('/api/audit-logs', auditRouter);
    this.app.use('/api/research', researchRouter);
    this.app.use('/api/content', contentGenerateRouter);
    this.app.use('/api/content', contentItemRouter);
    this.app.use('/api/calendar', calendarRouter);
    this.app.use('/api/buffer', bufferRouter);
    this.app.use('/api/analytics', analyticsRouter);
    this.app.use('/api/jobs', jobsRouter);
  }

  private configureErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<http.Server> {
    const env = getEnv();
    await dbConnection.connect({ uri: env.MONGODB_URI });
    await SettingsService.getSettings();
    await BufferQuotaTracker.syncFromDatabase();

    if (env.NODE_ENV !== 'test') {
      await SchedulerService.initializeJobs();
      SchedulerService.startPolling(60000);
    }

    return new Promise((resolve) => {
      this.server = this.app.listen(env.PORT, () => {
        console.log(`XGrowth AI API listening on port ${env.PORT} in ${env.NODE_ENV} mode.`);
        resolve(this.server!);
      });
    });
  }

  public async stop(): Promise<void> {
    SchedulerService.stopPolling();
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
