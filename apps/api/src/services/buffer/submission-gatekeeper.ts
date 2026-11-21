import { ContentItemDocument } from '../../db/models/content-item.model.js';
import { ProviderSubmissionModel } from '../../db/models/provider-submission.model.js';
import { EmergencyPauseService } from '../emergency-pause.service.js';
import { ContentHasher } from '../content/hasher.js';
import { ContentStatusEnum } from '@xgrowth/shared';
import { SubmissionIdempotency } from './idempotency.js';

export interface PreSubmissionVerificationResult {
  allowed: boolean;
  reason?: string;
  idempotencyKey?: string;
}

export class SubmissionGatekeeper {
  public static async verify(
    item: ContentItemDocument,
    channelId: string,
  ): Promise<PreSubmissionVerificationResult> {
    // 1. Gate: Emergency Pause
    const isPaused = await EmergencyPauseService.isPaused();
    if (isPaused) {
      return {
        allowed: false,
        reason: 'Submission blocked: Global emergency pause is active.',
      };
    }

    // 2. Gate: Approval Status
    if (item.status !== ContentStatusEnum.APPROVED) {
      return {
        allowed: false,
        reason: `Submission blocked: Content item status is '${item.status}', must be 'approved'.`,
      };
    }

    // 3. Gate: Cryptographic Hash Integrity
    const currentHash = ContentHasher.computeApprovalHash({
      text: item.text,
      threadParts: item.threadParts,
      channelId,
      mediaUrls: [],
    });

    const expectedHash = item.approval?.approvedHash || item.contentHash;
    if (!expectedHash || currentHash !== expectedHash) {
      return {
        allowed: false,
        reason: 'Submission blocked: Current content hash does not match approved hash (stale or modified content).',
      };
    }

    // 4. Gate: Duplicate Prevention via Idempotency Key
    const idempotencyKey = SubmissionIdempotency.generateKey(
      item._id.toString(),
      currentHash,
      channelId,
    );

    const existingSubmission = await ProviderSubmissionModel.findOne({ idempotencyKey });
    if (existingSubmission && (existingSubmission.status === 'queued' || existingSubmission.status === 'published')) {
      return {
        allowed: false,
        reason: `Submission blocked: Content has already been submitted (existing submission ID: ${existingSubmission._id}).`,
      };
    }

    return {
      allowed: true,
      idempotencyKey,
    };
  }
}
