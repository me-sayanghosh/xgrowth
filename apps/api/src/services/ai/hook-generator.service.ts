import { getEnv } from '@xgrowth/config';
import { SettingsService } from '../settings.service.js';
import { SupportedLanguage } from './prompts.js';

export interface GenerateHooksInput {
  topic: string;
  pillar?: string;
  keyTakeaway?: string;
  language?: SupportedLanguage;
  count?: number;
}

export interface GeneratedHook {
  hook: string;
  style: 'problem_first' | 'contrarian_observation' | 'metric_benchmark' | 'question_curiosity' | 'teardown_lesson';
  charCount: number;
}

export class HookGeneratorService {
  public static async generateHooks(input: GenerateHooksInput): Promise<GeneratedHook[]> {
    const env = getEnv();
    const settings = await SettingsService.getSettings();
    const targetLang = input.language || settings.language || 'en';
    const count = Math.min(Math.max(input.count || 4, 3), 5);

    if (env.GEMINI_API_KEY) {
      try {
        const hooks = await this.generateWithGemini(input, targetLang, count, env.GEMINI_API_KEY, env.GEMINI_MODEL || 'gemini-2.5-flash');
        if (hooks.length > 0) return hooks;
      } catch (err) {
        // Fallback to deterministic generator
      }
    }

    return this.generateDeterministic(input, targetLang, count);
  }

  private static async generateWithGemini(
    input: GenerateHooksInput,
    language: SupportedLanguage,
    count: number,
    apiKey: string,
    model: string,
  ): Promise<GeneratedHook[]> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `Generate ${count} compelling, authentic opening hooks for an X post about software engineering.
Topic: ${input.topic}
Pillar: ${input.pillar || 'Software Engineering'}
Key Takeaway: ${input.keyTakeaway || input.topic}
Language: ${language}

Rules:
- Strictly under 140 characters per hook.
- Grounded in real engineering practice, trade-offs, or system architecture.
- ZERO clickbait, zero superficial hype (no "mind-blowing", "secret trick", "game-changer").
- Respond in JSON with an array named "hooks" of objects:
  { "hook": string, "style": "problem_first" | "contrarian_observation" | "metric_benchmark" | "question_curiosity" | "teardown_lesson" }`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return [];

    const parsed = JSON.parse(raw) as { hooks?: Array<{ hook: string; style: string }> };
    const validStyles = ['problem_first', 'contrarian_observation', 'metric_benchmark', 'question_curiosity', 'teardown_lesson'] as const;

    return (parsed.hooks || []).slice(0, count).map((h) => {
      const style = validStyles.includes(h.style as any) ? (h.style as any) : 'problem_first';
      return {
        hook: h.hook.trim(),
        style,
        charCount: h.hook.trim().length,
      };
    });
  }

  public static generateDeterministic(
    input: GenerateHooksInput,
    language: SupportedLanguage,
    count: number,
  ): GeneratedHook[] {
    const topic = input.topic.trim();
    const takeaway = input.keyTakeaway?.trim() || topic;

    if (language === 'bn') {
      const bnTemplates: Array<{ template: string; style: GeneratedHook['style'] }> = [
        { template: `${topic}-এ সবচেয়ে সাধারণ আর্কিটেকচারাল ভুল কোনটি?`, style: 'question_curiosity' },
        { template: `${topic} বাস্তবায়নে মূল চ্যালেঞ্জ: ${takeaway}।`, style: 'problem_first' },
        { template: `${topic} নিয়ে প্রচলিত ধারণার বাইরে কী বিবেচনা করা উচিত?`, style: 'contrarian_observation' },
        { template: `প্রোডাকশন সিস্টেমে ${topic} অপ্টিমাইজেশনের বাস্তব অভিজ্ঞতা ও মেট্রিক্স।`, style: 'metric_benchmark' },
        { template: `পোস্ট-মর্টেম নোটস: ${topic} সিস্টেমে ফেইলওভার ম্যানেজমেন্টের শিক্ষা।`, style: 'teardown_lesson' },
      ];

      return bnTemplates.slice(0, count).map((t) => ({
        hook: t.template,
        style: t.style,
        charCount: t.template.length,
      }));
    }

    if (language === 'mixed') {
      const mixedTemplates: Array<{ template: string; style: GeneratedHook['style'] }> = [
        { template: `Production-এ ${topic} scale করার সময় যে bottleneck-গুলো সবচেয়ে বেশি ভোগায়:`, style: 'problem_first' },
        { template: `${topic} নিয়ে সাধারণ consensus কিন্তু সবসময় production trade-off সমাধান করে না।`, style: 'contrarian_observation' },
        { template: `আমরা যখন ${topic} migrate করলাম, তখন p99 latency-তে স্পষ্ট উন্নতি দেখা গেছে।`, style: 'metric_benchmark' },
        { template: `${topic} design করার সময় কোন failure scenario-টা আপনি সবচেয়ে আগে হ্যান্ডেল করবেন?`, style: 'question_curiosity' },
        { template: `Production incident teardown: ${topic} নিয়ে আমাদের কী শিক্ষা হলো?`, style: 'teardown_lesson' },
      ];

      return mixedTemplates.slice(0, count).map((t) => ({
        hook: t.template,
        style: t.style,
        charCount: t.template.length,
      }));
    }

    const enTemplates: Array<{ template: string; style: GeneratedHook['style'] }> = [
      { template: `Most failures in ${topic} stem from one unhandled edge case:`, style: 'problem_first' },
      { template: `The biggest trade-off with ${topic} that textbooks usually gloss over:`, style: 'contrarian_observation' },
      { template: `How we benchmarked ${topic} under heavy concurrency:`, style: 'metric_benchmark' },
      { template: `What happens when ${topic} faces unexpected network partitions?`, style: 'question_curiosity' },
      { template: `Post-mortem teardown: Lessons learned building reliable ${topic}.`, style: 'teardown_lesson' },
    ];

    return enTemplates.slice(0, count).map((t) => ({
      hook: t.template,
      style: t.style,
      charCount: t.template.length,
    }));
  }
}
