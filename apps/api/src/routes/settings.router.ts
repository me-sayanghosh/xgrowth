import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';
import { csrfProtection } from '../middlewares/csrf.js';
import { mutationRateLimiter } from '../middlewares/rate-limit.js';

export const settingsRouter = Router();

settingsRouter.use(singleOwnerAuthMiddleware);

settingsRouter.get('/', SettingsController.getSettings);
settingsRouter.patch('/', csrfProtection, mutationRateLimiter, SettingsController.updateSettings);
settingsRouter.post('/emergency-pause', csrfProtection, mutationRateLimiter, SettingsController.toggleEmergencyPause);
