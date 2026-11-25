import { ScheduledJobModel } from '../../db/models/scheduled-job.model.js';
import { ScheduledJobType, ScheduledJobTypeEnum } from '@xgrowth/shared';
import { logger } from '../../middlewares/logger.js';
import { matchesCron } from './cron-evaluator.js';
import { runResearchSyncTask } from './tasks/research-sync.task.js';
import { runBufferReconciliationTask } from './tasks/buffer-sync.task.js';
import { runWeeklyReportTask } from './tasks/weekly-report.task.js';

export type JobHandler = () => Promise<string | void>;

export class SchedulerService {
  private static handlers: Map<ScheduledJobType, JobHandler> = new Map();
  private static intervalTimer: NodeJS.Timeout | null = null;

  public static registerHandler(type: ScheduledJobType, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  public static registerDefaultHandlers(): void {
    this.registerHandler(ScheduledJobTypeEnum.RESEARCH_SYNC, runResearchSyncTask);
    this.registerHandler(ScheduledJobTypeEnum.STATUS_RECONCILIATION, runBufferReconciliationTask);
    this.registerHandler(ScheduledJobTypeEnum.ANALYTICS_IMPORT, runWeeklyReportTask);
  }

  public static async initializeJobs(): Promise<void> {
    const defaultJobs = [
      {
        name: 'Research Feeds Sync',
        type: ScheduledJobTypeEnum.RESEARCH_SYNC,
        cronExpression: '0 */4 * * *', // every 4 hours
      },
      {
        name: 'Buffer Status Reconciliation',
        type: ScheduledJobTypeEnum.STATUS_RECONCILIATION,
        cronExpression: '0 */6 * * *', // every 6 hours
      },
      {
        name: 'Weekly Performance Report Generator',
        type: ScheduledJobTypeEnum.ANALYTICS_IMPORT,
        cronExpression: '0 10 * * 1', // Mondays at 10:00
      },
    ];

    for (const job of defaultJobs) {
      await ScheduledJobModel.findOneAndUpdate(
        { type: job.type },
        { $setOnInsert: { name: job.name, cronExpression: job.cronExpression, enabled: true, status: 'idle' } },
        { upsert: true, new: true },
      );
    }
  }

  public static async executeJob(type: ScheduledJobType, isManual = false): Promise<boolean> {
    const handler = this.handlers.get(type);
    if (!handler) {
      logger.warn(`No handler registered for scheduled job type: ${type}`);
      return false;
    }

    const now = new Date();
    const lockExpiry = new Date(now.getTime() + 10 * 60 * 1000); // 10 minute lock lease

    // Atomic acquire lock
    const job = await ScheduledJobModel.findOneAndUpdate(
      {
        type,
        $or: [
          { status: { $ne: 'running' } },
          { lockedUntil: { $lt: now } }, // reclaim stale lock
        ],
      },
      {
        status: 'running',
        lockedUntil: lockExpiry,
      },
      { new: true },
    );

    if (!job) {
      logger.info(`Job ${type} is already running or locked.`);
      return false;
    }

    const startTime = Date.now();
    try {
      const message = await handler();
      const durationMs = Date.now() - startTime;

      job.status = 'idle';
      job.lastRunAt = new Date();
      job.lockedUntil = undefined;
      job.logs.push({
        runAt: new Date(),
        durationMs,
        status: 'success',
        message: (message as string) || (isManual ? 'Manual execution completed.' : 'Scheduled run completed.'),
      });

      if (job.logs.length > 50) {
        job.logs = job.logs.slice(-50);
      }

      await job.save();
      return true;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      job.status = 'failed';
      job.lastRunAt = new Date();
      job.lockedUntil = undefined;
      job.logs.push({
        runAt: new Date(),
        durationMs,
        status: 'failed',
        error: (error as Error).message,
      });

      if (job.logs.length > 50) {
        job.logs = job.logs.slice(-50);
      }

      await job.save();
      return false;
    }
  }

  public static async evaluateAndRunDueJobs(now: Date = new Date()): Promise<string[]> {
    const enabledJobs = await ScheduledJobModel.find({ enabled: true });
    const triggeredTypes: string[] = [];

    const currentMinuteKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${now.getUTCMinutes()}`;

    for (const job of enabledJobs) {
      if (!matchesCron(job.cronExpression, now)) {
        continue;
      }

      if (job.lastRunAt) {
        const last = new Date(job.lastRunAt);
        const lastKey = `${last.getUTCFullYear()}-${last.getUTCMonth()}-${last.getUTCDate()}-${last.getUTCHours()}-${last.getUTCMinutes()}`;
        if (lastKey === currentMinuteKey) {
          continue; // Already ran in this minute
        }
      }

      const ran = await this.executeJob(job.type, false);
      if (ran) {
        triggeredTypes.push(job.type);
      }
    }

    return triggeredTypes;
  }

  public static startPolling(intervalMs = 60000): void {
    if (this.intervalTimer) return;
    this.registerDefaultHandlers();
    this.intervalTimer = setInterval(() => {
      void this.evaluateAndRunDueJobs().catch((err) => {
        logger.error({ err }, 'Scheduler polling cycle failed');
      });
    }, intervalMs);
  }

  public static stopPolling(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}
