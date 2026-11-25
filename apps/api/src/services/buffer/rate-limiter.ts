import { ProviderSubmissionModel } from '../../db/models/provider-submission.model.js';

export class BufferQuotaTracker {
  private static monthlyLimit = 1000;
  private static usageCount = 0;
  private static cycleResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  public static recordApiCall(): void {
    const now = new Date();
    if (now > this.cycleResetDate) {
      this.usageCount = 0;
      this.cycleResetDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    this.usageCount++;
  }

  public static async syncFromDatabase(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const persistedCount = await ProviderSubmissionModel.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });
    if (persistedCount > this.usageCount) {
      this.usageCount = persistedCount;
    }
    return this.usageCount;
  }

  public static getRemainingQuota(): number {
    return Math.max(0, this.monthlyLimit - this.usageCount);
  }

  public static getUsageCount(): number {
    return this.usageCount;
  }

  public static setUsageCount(count: number): void {
    this.usageCount = count;
  }

  public static isApproachingQuota(warningThreshold = 0.85): boolean {
    return this.usageCount >= this.monthlyLimit * warningThreshold;
  }

  public static shouldThrottleBackgroundJob(): boolean {
    return this.isApproachingQuota(0.9); // throttle at 90%
  }

  public static getQuotaStatus(): {
    monthlyLimit: number;
    usageCount: number;
    remaining: number;
    cycleResetDate: string;
    isApproachingLimit: boolean;
  } {
    return {
      monthlyLimit: this.monthlyLimit,
      usageCount: this.usageCount,
      remaining: this.getRemainingQuota(),
      cycleResetDate: this.cycleResetDate.toISOString(),
      isApproachingLimit: this.isApproachingQuota(),
    };
  }
}
