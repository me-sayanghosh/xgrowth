import { ContentItemModel } from '../../../db/models/content-item.model.js';
import { ContentStatusEnum } from '@xgrowth/shared';
import { EmergencyPauseService } from '../../emergency-pause.service.js';
import { SettingsService } from '../../settings.service.js';
import { BufferQuotaTracker } from '../../buffer/rate-limiter.js';
import { BufferSubmissionService } from '../../buffer/submission.service.js';
import { ChannelDiscoveryService } from '../../buffer/channel-discovery.service.js';
import { BufferProvider } from '../../buffer/buffer-provider.interface.js';

export interface AutoPublishResult {
  submitted: number;
  skippedReason?: string;
  errors: string[];
}

export class AutoPublisherService {
  public static async run(
    provider?: BufferProvider,
    now: Date = new Date(),
  ): Promise<AutoPublishResult> {
    if (await EmergencyPauseService.isPaused()) {
      return { submitted: 0, skippedReason: 'global_pause_active', errors: [] };
    }

    await BufferQuotaTracker.syncFromDatabase();
    if (BufferQuotaTracker.shouldThrottleBackgroundJob()) {
      return { submitted: 0, skippedReason: 'buffer_quota_throttled', errors: [] };
    }

    const settings = await SettingsService.getSettings();
    const maxPerDay = settings.maxPostsPerDay || 3;

    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const submittedToday = await ContentItemModel.countDocuments({
      status: {
        $in: [
          ContentStatusEnum.SUBMITTED_TO_BUFFER,
          ContentStatusEnum.QUEUED,
          ContentStatusEnum.PUBLISHED,
        ],
      },
      'buffer.submittedAt': { $gte: dayStart, $lte: dayEnd },
    });

    const remainingDailySlots = Math.max(0, maxPerDay - submittedToday);
    if (remainingDailySlots === 0) {
      return { submitted: 0, skippedReason: 'daily_post_limit_reached', errors: [] };
    }

    // Fetch strictly APPROVED items whose scheduledFor is either due (<= now) or unset
    const candidates = await ContentItemModel.find({
      status: ContentStatusEnum.APPROVED,
      $or: [{ scheduledFor: { $exists: false } }, { scheduledFor: null }, { scheduledFor: { $lte: now } }],
    })
      .sort({ scheduledFor: 1, createdAt: 1 })
      .limit(remainingDailySlots);

    if (candidates.length === 0) {
      return { submitted: 0, skippedReason: 'no_due_approved_items', errors: [] };
    }

    const submissionService = new BufferSubmissionService(provider);
    let fallbackChannelId: string | undefined;
    let submitted = 0;
    const errors: string[] = [];

    for (const item of candidates) {
      const isDueScheduled = Boolean(item.scheduledFor && new Date(item.scheduledFor) <= now);
      const isCategoryApproved =
        Boolean(item.topicPillar) && settings.brandPillars.includes(item.topicPillar!);

      const eligible =
        settings.operationMode === 'full_auto_submit' ||
        (settings.operationMode === 'approved_category_auto_submit' && (isCategoryApproved || isDueScheduled)) ||
        (settings.operationMode === 'review_everything' && isDueScheduled);

      if (!eligible) {
        continue;
      }

      let channelId = item.buffer?.channelId;
      if (!channelId) {
        if (!fallbackChannelId) {
          const channels = await ChannelDiscoveryService.listXChannels(provider);
          fallbackChannelId = channels[0]?.id;
        }
        channelId = fallbackChannelId;
      }

      if (!channelId) {
        errors.push(`No X channel available for item ${item._id.toString()}`);
        continue;
      }

      try {
        const res = await submissionService.submitApprovedItem({
          contentItemId: item._id.toString(),
          channelId,
          schedulingType: item.scheduledFor ? 'scheduled' : 'addToQueue',
          dueAt: item.scheduledFor ? new Date(item.scheduledFor).toISOString() : undefined,
          actor: 'scheduler-auto-publish',
        });

        if (res.success) {
          submitted++;
        } else {
          errors.push(`Item ${item._id.toString()}: ${res.message}`);
        }
      } catch (err) {
        errors.push(`Item ${item._id.toString()}: ${(err as Error).message}`);
      }
    }

    return { submitted, errors };
  }
}

export async function runAutoPublishTask(): Promise<string> {
  const result = await AutoPublisherService.run();
  if (result.skippedReason) {
    return `Auto-publish skipped (${result.skippedReason}).`;
  }
  return `Auto-publish dispatched ${result.submitted} post(s) to Buffer.${result.errors.length > 0 ? ` Errors: ${result.errors.length}` : ''}`;
}
