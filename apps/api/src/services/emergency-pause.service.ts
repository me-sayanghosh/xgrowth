import { UserSettingsModel } from '../db/models/user-settings.model.js';
import { AuditService } from './audit.service.js';
import { AuditActionEnum } from '@xgrowth/shared';

export class EmergencyPauseService {
  public static async isPaused(): Promise<boolean> {
    const settings = await UserSettingsModel.findOne();
    if (!settings) {
      return true; // Default-safe: if no settings document exists, hold everything
    }
    return settings.globalPause;
  }

  public static async setPaused(
    paused: boolean,
    actor = 'owner',
    reason?: string,
  ): Promise<boolean> {
    const settings = await UserSettingsModel.findOneAndUpdate(
      {},
      { globalPause: paused },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await AuditService.recordEvent({
      action: AuditActionEnum.PAUSE_TOGGLED,
      actor,
      metadata: {
        previousState: !paused,
        newState: paused,
        reason: reason || (paused ? 'Emergency pause activated' : 'Emergency pause released'),
      },
    });

    return settings.globalPause;
  }
}
