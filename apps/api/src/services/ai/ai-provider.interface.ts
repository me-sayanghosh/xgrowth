import { Result, ContentFormat } from '@xgrowth/shared';

export interface DraftVariant {
  text: string;
  format: ContentFormat;
  threadParts?: string[];
  hook: string;
  angle: string;
  estimatedCharCount: number;
}

export interface GenerateDraftsInput {
  topic: string;
  topicPillar: string;
  whyItMatters: string;
  verifiedFacts: string[];
  uncertainties?: string[];
  suggestedAngle?: string;
  format: ContentFormat;
  brandVoiceTraits: string[];
  brandVoiceAvoid: string[];
  sourceUrls?: string[];
  variantCount?: number;
}

export interface AIError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface AIProvider {
  name: string;
  generateVariants(input: GenerateDraftsInput): Promise<Result<DraftVariant[], AIError>>;
}
