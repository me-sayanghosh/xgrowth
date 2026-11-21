import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SettingsService } from '../services/settings.service.js';
import { EmergencyPauseService } from '../services/emergency-pause.service.js';

const updateSettingsSchema = z.object({
  appName: z.string().optional(),
  globalPause: z.boolean().optional(),
  operationMode: z.enum(['review_everything', 'approved_category_auto_submit', 'full_auto_submit']).optional(),
  timezone: z.string().optional(),
  brandPillars: z.array(z.string()).optional(),
  voiceTraits: z.array(z.string()).optional(),
  voiceAvoid: z.array(z.string()).optional(),
  preferredWindows: z.array(z.string()).optional(),
  maxPostsPerDay: z.number().int().positive().optional(),
  aiProvider: z.string().optional(),
  aiModel: z.string().optional(),
});

const emergencyPauseSchema = z.object({
  paused: z.boolean(),
  reason: z.string().optional(),
});

export class SettingsController {
  public static async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await SettingsService.getSettings();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  }

  public static async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateSettingsSchema.parse(req.body);
      const updated = await SettingsService.updateSettings(validated, (req as { user?: { id?: string } }).user?.id || 'owner');
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  public static async toggleEmergencyPause(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paused, reason } = emergencyPauseSchema.parse(req.body);
      const newStatus = await EmergencyPauseService.setPaused(paused, (req as { user?: { id?: string } }).user?.id || 'owner', reason);
      res.json({
        success: true,
        globalPause: newStatus,
        message: newStatus ? 'Global emergency pause activated.' : 'Global emergency pause released.',
      });
    } catch (error) {
      next(error);
    }
  }
}
