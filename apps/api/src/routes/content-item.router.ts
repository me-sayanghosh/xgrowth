import { Router } from 'express';
import { ContentItemController } from '../controllers/content-item.controller.js';
import { singleOwnerAuthMiddleware } from '../middlewares/auth.js';
import { csrfProtection } from '../middlewares/csrf.js';
import { mutationRateLimiter } from '../middlewares/rate-limit.js';

export const contentItemRouter = Router();

contentItemRouter.use(singleOwnerAuthMiddleware);

contentItemRouter.get('/items', ContentItemController.listItems);
contentItemRouter.post('/items/batch-approve', csrfProtection, mutationRateLimiter, ContentItemController.batchApprove);
contentItemRouter.post('/items/batch-reject', csrfProtection, mutationRateLimiter, ContentItemController.batchReject);
contentItemRouter.get('/items/:id', ContentItemController.getItemById);
contentItemRouter.patch('/items/:id', csrfProtection, mutationRateLimiter, ContentItemController.patchItem);
contentItemRouter.post('/items/:id/approve', csrfProtection, mutationRateLimiter, ContentItemController.approveItem);
contentItemRouter.post('/items/:id/reject', csrfProtection, mutationRateLimiter, ContentItemController.rejectItem);
