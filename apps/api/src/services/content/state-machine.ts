import { ContentStatus, ContentStatusEnum } from '@xgrowth/shared';

export class IllegalStateTransitionError extends Error {
  constructor(public readonly from: ContentStatus, public readonly to: ContentStatus) {
    super(`Illegal content state transition from '${from}' to '${to}'.`);
    this.name = 'IllegalStateTransitionError';
  }
}

export class ContentStateMachine {
  private static VALID_TRANSITIONS: Record<ContentStatus, Set<ContentStatus>> = {
    [ContentStatusEnum.IDEA]: new Set([
      ContentStatusEnum.RESEARCHED,
      ContentStatusEnum.NEEDS_SOURCE_REVIEW,
      ContentStatusEnum.ARCHIVED,
      ContentStatusEnum.REJECTED,
    ]),
    [ContentStatusEnum.RESEARCHED]: new Set([
      ContentStatusEnum.DRAFT,
      ContentStatusEnum.NEEDS_REVIEW,
      ContentStatusEnum.ARCHIVED,
      ContentStatusEnum.REJECTED,
    ]),
    [ContentStatusEnum.NEEDS_SOURCE_REVIEW]: new Set([
      ContentStatusEnum.RESEARCHED,
      ContentStatusEnum.ARCHIVED,
      ContentStatusEnum.REJECTED,
    ]),
    [ContentStatusEnum.DRAFT]: new Set([
      ContentStatusEnum.NEEDS_REVIEW,
      ContentStatusEnum.ARCHIVED,
      ContentStatusEnum.REJECTED,
    ]),
    [ContentStatusEnum.NEEDS_REVIEW]: new Set([
      ContentStatusEnum.APPROVED,
      ContentStatusEnum.DRAFT,
      ContentStatusEnum.ARCHIVED,
      ContentStatusEnum.REJECTED,
    ]),
    [ContentStatusEnum.APPROVED]: new Set([
      ContentStatusEnum.NEEDS_REVIEW, // when edited or invalidation occurs
      ContentStatusEnum.SUBMITTED_TO_BUFFER,
      ContentStatusEnum.PAUSED,
      ContentStatusEnum.ARCHIVED,
      ContentStatusEnum.REJECTED,
    ]),
    [ContentStatusEnum.PAUSED]: new Set([
      ContentStatusEnum.APPROVED,
      ContentStatusEnum.NEEDS_REVIEW,
      ContentStatusEnum.ARCHIVED,
    ]),
    [ContentStatusEnum.SUBMITTED_TO_BUFFER]: new Set([
      ContentStatusEnum.QUEUED,
      ContentStatusEnum.PUBLISHED,
      ContentStatusEnum.FAILED,
      ContentStatusEnum.UNKNOWN,
    ]),
    [ContentStatusEnum.QUEUED]: new Set([
      ContentStatusEnum.PUBLISHED,
      ContentStatusEnum.FAILED,
      ContentStatusEnum.UNKNOWN,
    ]),
    [ContentStatusEnum.PUBLISHED]: new Set([
      ContentStatusEnum.ARCHIVED,
    ]),
    [ContentStatusEnum.FAILED]: new Set([
      ContentStatusEnum.NEEDS_REVIEW,
      ContentStatusEnum.APPROVED,
      ContentStatusEnum.ARCHIVED,
    ]),
    [ContentStatusEnum.UNKNOWN]: new Set([
      ContentStatusEnum.QUEUED,
      ContentStatusEnum.PUBLISHED,
      ContentStatusEnum.FAILED,
      ContentStatusEnum.NEEDS_REVIEW,
    ]),
    [ContentStatusEnum.REJECTED]: new Set([
      ContentStatusEnum.ARCHIVED,
      ContentStatusEnum.DRAFT,
    ]),
    [ContentStatusEnum.ARCHIVED]: new Set([]),
  };

  public static canTransition(from: ContentStatus, to: ContentStatus): boolean {
    if (from === to) return true;
    const allowed = this.VALID_TRANSITIONS[from];
    return !!allowed && allowed.has(to);
  }

  public static assertTransition(from: ContentStatus, to: ContentStatus): void {
    if (!this.canTransition(from, to)) {
      throw new IllegalStateTransitionError(from, to);
    }
  }
}
