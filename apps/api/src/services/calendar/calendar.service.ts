import { SettingsService } from '../settings.service.js';
import { ContentItemModel, ContentItemDocument } from '../../db/models/content-item.model.js';
import { ContentStatusEnum } from '@xgrowth/shared';

export interface CalendarSlotDto {
  date: string; // YYYY-MM-DD
  timeWindow: string; // HH:mm
  targetDateTime: string; // ISO string
  item?: {
    id: string;
    text: string;
    status: string;
    format: string;
    topicPillar?: string;
  };
  isConflict: boolean;
  conflictReason?: string;
}

export interface DayScheduleSummary {
  date: string;
  totalScheduled: number;
  maxAllowed: number;
  isOverLimit: boolean;
  slots: CalendarSlotDto[];
}

export class CalendarService {
  public static async getCalendarSlots(days = 7): Promise<DayScheduleSummary[]> {
    const settings = await SettingsService.getSettings();
    const windows = settings.preferredWindows || ['09:00', '13:00', '19:00'];
    const maxPerDay = settings.maxPostsPerDay || 3;

    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + days);

    // Fetch all scheduled items within the time range
    const items = await ContentItemModel.find({
      scheduledFor: {
        $gte: startDate,
        $lte: endDate,
      },
      status: {
        $in: [
          ContentStatusEnum.APPROVED,
          ContentStatusEnum.QUEUED,
          ContentStatusEnum.SUBMITTED_TO_BUFFER,
          ContentStatusEnum.PUBLISHED,
        ],
      },
    }).sort({ scheduledFor: 1 });

    const summaries: DayScheduleSummary[] = [];

    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const currentDay = new Date(startDate);
      currentDay.setUTCDate(currentDay.getUTCDate() + dayOffset);
      const dateStr = currentDay.toISOString().split('T')[0] ?? '';

      // Count items on this day
      const dayStart = new Date(currentDay);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDay);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const itemsOnDay = items.filter((item) => {
        if (!item.scheduledFor) return false;
        const itemTime = new Date(item.scheduledFor).getTime();
        return itemTime >= dayStart.getTime() && itemTime <= dayEnd.getTime();
      });

      const isOverLimit = itemsOnDay.length > maxPerDay;
      const slots: CalendarSlotDto[] = [];

      for (const win of windows) {
        const [hours, minutes] = win.split(':').map((s) => parseInt(s, 10));
        const slotDate = new Date(currentDay);
        slotDate.setUTCHours(hours || 0, minutes || 0, 0, 0);
        const slotTimeStr = slotDate.toISOString();

        // Find items that match this slot (+/- 15 minutes window tolerance)
        const matchedItems = itemsOnDay.filter((i) => {
          if (!i.scheduledFor) return false;
          const diffMs = Math.abs(new Date(i.scheduledFor).getTime() - slotDate.getTime());
          return diffMs <= 15 * 60 * 1000;
        });

        const assignedItem = matchedItems[0];
        let isConflict = false;
        let conflictReason: string | undefined;

        if (matchedItems.length > 1) {
          isConflict = true;
          conflictReason = `Collision: ${matchedItems.length} items scheduled for this time slot`;
        } else if (isOverLimit) {
          isConflict = true;
          conflictReason = `Daily cap exceeded (${itemsOnDay.length}/${maxPerDay} posts on ${dateStr})`;
        }

        slots.push({
          date: dateStr,
          timeWindow: win,
          targetDateTime: slotTimeStr,
          item: assignedItem
            ? {
                id: assignedItem._id.toString(),
                text: assignedItem.text,
                status: assignedItem.status,
                format: assignedItem.format,
                topicPillar: assignedItem.topicPillar,
              }
            : undefined,
          isConflict,
          conflictReason,
        });
      }

      summaries.push({
        date: dateStr,
        totalScheduled: itemsOnDay.length,
        maxAllowed: maxPerDay,
        isOverLimit,
        slots,
      });
    }

    return summaries;
  }

  public static async assignSlot(
    contentItemId: string,
    scheduledFor: Date | string,
  ): Promise<ContentItemDocument> {
    const item = await ContentItemModel.findById(contentItemId);
    if (!item) {
      throw new Error(`Content item not found: ${contentItemId}`);
    }

    const targetDate = new Date(scheduledFor);
    if (isNaN(targetDate.getTime())) {
      throw new Error(`Invalid scheduled date format: ${scheduledFor}`);
    }

    item.scheduledFor = targetDate;
    await item.save();

    return item;
  }

  public static async unassignSlot(contentItemId: string): Promise<ContentItemDocument> {
    const item = await ContentItemModel.findById(contentItemId);
    if (!item) {
      throw new Error(`Content item not found: ${contentItemId}`);
    }

    item.scheduledFor = undefined;
    await item.save();

    return item;
  }
}
