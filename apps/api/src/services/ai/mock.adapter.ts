import { AIProvider, GenerateDraftsInput, DraftVariant, AIError } from './ai-provider.interface.js';
import { Result, ok } from '@xgrowth/shared';

export class MockAIAdapter implements AIProvider {
  public readonly name = 'mock';

  public async generateVariants(input: GenerateDraftsInput): Promise<Result<DraftVariant[], AIError>> {
    const count = input.variantCount || 2;
    const variants: DraftVariant[] = [];

    for (let i = 1; i <= count; i++) {
      const text = `${input.topic}: Key takeaway #${i}. ${input.whyItMatters} Tested in production with clean results.`;
      variants.push({
        text,
        format: input.format,
        threadParts: input.format === 'thread_draft' ? [`${input.topic} 🧵 (1/3)`, 'Part 2 detail', 'Part 3 conclusion'] : [],
        hook: `Exciting update on ${input.topic}!`,
        angle: input.suggestedAngle || 'Engineering best practice',
        estimatedCharCount: text.length,
      });
    }

    return ok(variants);
  }
}
