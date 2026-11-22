import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ContentItemModel } from '../db/models/content-item.model.js';
import { ApprovalService } from '../services/content/approval.service.js';
import { ContentItemService } from '../services/content/content-item.service.js';
import { ContentStateMachine } from '../services/content/state-machine.js';
import { ContentStatusEnum, AuditActionEnum } from '@xgrowth/shared';
import { AuditService } from '../services/audit.service.js';

const editItemSchema = z.object({
  text: z.string().optional(),
  threadParts: z.array(z.string()).optional(),
  topicPillar: z.string().optional(),
  audience: z.string().optional(),
  channelId: z.string().optional(),
});

const approveItemSchema = z.object({
  channelId: z.string().optional(),
});

const rejectItemSchema = z.object({
  reason: z.string().optional(),
});

const batchApproveSchema = z.object({
  ids: z.array(z.string()).min(1),
  channelId: z.string().optional(),
});

const batchRejectSchema = z.object({
  ids: z.array(z.string()).min(1),
  reason: z.string().optional(),
});

export class ContentItemController {
  public static async listItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, pillar, fromDate, toDate } = req.query;
      const query: Record<string, unknown> = {};

      if (status) query.status = status;
      if (pillar) query.topicPillar = pillar;
      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) (query.createdAt as Record<string, unknown>).$gte = new Date(fromDate as string);
        if (toDate) (query.createdAt as Record<string, unknown>).$lte = new Date(toDate as string);
      }

      const items = await ContentItemModel.find(query).sort({ createdAt: -1 });
      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  public static async getItemById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = await ContentItemModel.findById(req.params.id);
      if (!item) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Content item not found' });
        return;
      }
      res.json(item);
    } catch (error) {
      next(error);
    }
  }

  public static async patchItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = editItemSchema.parse(req.body);
      const actor = (req as { user?: { id?: string } }).user?.id || 'owner';
      const updated = await ContentItemService.updateItem(req.params.id as string, validated, actor);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  public static async approveItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { channelId } = approveItemSchema.parse(req.body);
      const actor = (req as { user?: { id?: string } }).user?.id || 'owner';
      const approved = await ApprovalService.approveDraft({
        contentItemId: req.params.id as string,
        approvedBy: actor,
        channelId,
      });
      res.json({ success: true, item: approved });
    } catch (error) {
      next(error);
    }
  }

  public static async rejectItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = rejectItemSchema.parse(req.body);
      const actor = (req as { user?: { id?: string } }).user?.id || 'owner';

      const item = await ContentItemModel.findById(req.params.id);
      if (!item) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Content item not found' });
        return;
      }

      ContentStateMachine.assertTransition(item.status, ContentStatusEnum.REJECTED);
      item.status = ContentStatusEnum.REJECTED;
      await item.save();

      await AuditService.recordEvent({
        action: AuditActionEnum.CONTENT_REJECTED,
        actor,
        targetId: item._id.toString(),
        targetType: 'ContentItem',
        metadata: { reason },
      });

      res.json({ success: true, item });
    } catch (error) {
      next(error);
    }
  }

  public static async batchApprove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ids, channelId } = batchApproveSchema.parse(req.body);
      const actor = (req as { user?: { id?: string } }).user?.id || 'owner';
      const approved: any[] = [];
      const errors: Array<{ id: string; error: string }> = [];

      for (const id of ids) {
        try {
          const item = await ApprovalService.approveDraft({
            contentItemId: id,
            approvedBy: actor,
            channelId,
          });
          approved.push(item);
        } catch (err) {
          errors.push({ id, error: (err as Error).message });
        }
      }

      res.json({
        success: true,
        count: approved.length,
        items: approved,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async batchReject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ids, reason } = batchRejectSchema.parse(req.body);
      const actor = (req as { user?: { id?: string } }).user?.id || 'owner';
      const rejected: any[] = [];
      const errors: Array<{ id: string; error: string }> = [];

      for (const id of ids) {
        try {
          const item = await ContentItemModel.findById(id);
          if (!item) {
            errors.push({ id, error: 'Not found' });
            continue;
          }
          ContentStateMachine.assertTransition(item.status, ContentStatusEnum.REJECTED);
          item.status = ContentStatusEnum.REJECTED;
          await item.save();

          await AuditService.recordEvent({
            action: AuditActionEnum.CONTENT_REJECTED,
            actor,
            targetId: item._id.toString(),
            targetType: 'ContentItem',
            metadata: { reason: reason || 'Batch rejected' },
          });
          rejected.push(item);
        } catch (err) {
          errors.push({ id, error: (err as Error).message });
        }
      }

      res.json({
        success: true,
        count: rejected.length,
        items: rejected,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      next(error);
    }
  }
}
