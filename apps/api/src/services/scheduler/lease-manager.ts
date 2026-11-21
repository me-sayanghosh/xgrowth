import { ScheduledJobModel } from '../../db/models/scheduled-job.model.js';
import { logger } from '../../middlewares/logger.js';

export class LeaseManager {
  public static async reclaimStaleLocks(): Promise<number> {
    const now = new Date();
    const result = await ScheduledJobModel.updateMany(
      {
        status: 'running',
        lockedUntil: { $lt: now },
      },
      {
        $set: { status: 'idle', lockedUntil: null },
      },
    );

    if (result.modifiedCount > 0) {
      logger.warn(`Reclaimed ${result.modifiedCount} stale job locks.`);
    }

    return result.modifiedCount;
  }
}
