import { AIProvider } from './ai-provider.interface.js';
import { GeminiAIAdapter } from './gemini.adapter.js';
import { MockAIAdapter } from './mock.adapter.js';
import { ToneLinter } from './tone-linter.js';
import { CharacterValidator } from './character-validator.js';
import { ContentItemModel, ContentItemDocument } from '../../db/models/content-item.model.js';
import { ContentStatusEnum, ContentFormat } from '@xgrowth/shared';
import { SettingsService } from '../settings.service.js';
import { getEnv } from '@xgrowth/config';

export interface RequestDraftGenerationInput {
  topic: string;
  topicPillar: string;
  whyItMatters: string;
  verifiedFacts: string[];
  format: ContentFormat;
  sourceUrls?: string[];
  variantCount?: number;
}

export class DraftGeneratorService {
  private aiProvider: AIProvider;

  constructor(provider?: AIProvider) {
    if (provider) {
      this.aiProvider = provider;
    } else {
      const env = getEnv();
      this.aiProvider = env.GEMINI_API_KEY ? new GeminiAIAdapter() : new MockAIAdapter();
    }
  }

  public async generateAndPersistDrafts(
    input: RequestDraftGenerationInput,
  ): Promise<ContentItemDocument[]> {
    const settings = await SettingsService.getSettings();

    const result = await this.aiProvider.generateVariants({
      topic: input.topic,
      topicPillar: input.topicPillar,
      whyItMatters: input.whyItMatters,
      verifiedFacts: input.verifiedFacts,
      format: input.format,
      brandVoiceTraits: settings.voiceTraits,
      brandVoiceAvoid: settings.voiceAvoid,
      sourceUrls: input.sourceUrls,
      variantCount: input.variantCount || 2,
    });

    if (!result.ok) {
      throw new Error(`AI Generation failed: [${result.error.code}] ${result.error.message}`);
    }

    const createdItems: ContentItemDocument[] = [];

    for (const variant of result.value) {
      const lint = ToneLinter.lintDraft(variant.text, variant.threadParts);
      const charValidation = CharacterValidator.validate(variant.text);

      const riskFlags = [...lint.riskFlags];
      if (!charValidation.isValid) {
        riskFlags.push(`Exceeds 280-char X platform limit (${charValidation.charCount} chars)`);
      }

      const item = await ContentItemModel.create({
        status: ContentStatusEnum.NEEDS_REVIEW,
        format: variant.format,
        text: variant.text,
        threadParts: variant.threadParts,
        topicPillar: input.topicPillar,
        sourceUrls: input.sourceUrls || [],
        researchNotes: `Angle: ${variant.angle} | Hook: ${variant.hook}`,
        qualityFlags: lint.qualityFlags,
        riskFlags,
      });

      createdItems.push(item);
    }

    return createdItems;
  }
}
