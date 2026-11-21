import { AIProvider, GenerateDraftsInput, DraftVariant, AIError } from './ai-provider.interface.js';
import { Result, ok, err } from '@xgrowth/shared';
import { getEnv } from '@xgrowth/config';

export class GeminiAIAdapter implements AIProvider {
  public readonly name = 'gemini';

  public async generateVariants(input: GenerateDraftsInput): Promise<Result<DraftVariant[], AIError>> {
    const env = getEnv();
    const apiKey = env.GEMINI_API_KEY;
    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      return err({
        code: 'MISSING_API_KEY',
        message: 'GEMINI_API_KEY is not configured in the environment.',
        retryable: false,
      });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const systemPrompt = `You are an expert technical content writer creating engaging, authentic posts on X for a senior software engineer.
Brand Voice Traits: ${input.brandVoiceTraits.join(', ')}
Avoid: ${input.brandVoiceAvoid.join(', ')}
Formatting: Must fit within 280 characters for single posts or provide sequential thread parts.
Never hallucinate statistics or credentials. Ground facts exclusively in the provided source material.
Respond in valid JSON with an array named "variants" containing objects with:
- text: string (the full post text)
- hook: string (the first engaging sentence)
- angle: string (why this post is interesting)
- threadParts: array of strings (if thread format, otherwise empty)`;

    const userPrompt = `Topic: ${input.topic}
Pillar: ${input.topicPillar}
Why it matters: ${input.whyItMatters}
Verified Facts:
${input.verifiedFacts.map((f) => `- ${f}`).join('\n')}
Format: ${input.format}
Generate ${input.variantCount || 2} distinct variants.`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return err({
          code: `GEMINI_HTTP_${response.status}`,
          message: `Gemini API returned error: ${errorText}`,
          retryable: response.status === 429 || response.status >= 500,
        });
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        return err({
          code: 'EMPTY_RESPONSE',
          message: 'Gemini returned an empty candidate text.',
          retryable: true,
        });
      }

      const parsed = JSON.parse(rawJson) as {
        variants?: Array<{ text: string; hook: string; angle: string; threadParts?: string[] }>;
      };

      const variants: DraftVariant[] = (parsed.variants || []).map((v) => ({
        text: v.text,
        format: input.format,
        threadParts: v.threadParts || [],
        hook: v.hook || '',
        angle: v.angle || '',
        estimatedCharCount: v.text.length,
      }));

      return ok(variants);
    } catch (error) {
      return err({
        code: 'NETWORK_ERROR',
        message: (error as Error).message,
        retryable: true,
      });
    }
  }
}
