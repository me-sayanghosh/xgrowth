import { ContentFormat } from '@xgrowth/shared';

export interface PromptTemplate {
  format: ContentFormat;
  systemDirective: string;
  userTemplate: (facts: string[], angle: string, pillar: string) => string;
}

export const PROMPT_TEMPLATES: Record<ContentFormat, PromptTemplate> = {
  single_post: {
    format: 'single_post',
    systemDirective: 'Write a punchy, single standalone post under 260 characters. Clear hook, strong technical insight, zero fluff.',
    userTemplate: (facts, angle, pillar) =>
      `Pillar: ${pillar}\nAngle: ${angle}\nFacts:\n${facts.map((f) => `- ${f}`).join('\n')}\nDeliver one memorable, authentic post.`,
  },
  educational_tip: {
    format: 'educational_tip',
    systemDirective: 'Structure as a "Tip / Insight": Hook identifying a problem -> technical solution -> actionable rule.',
    userTemplate: (facts, angle, pillar) =>
      `Pillar: ${pillar}\nAngle: ${angle}\nFacts:\n${facts.map((f) => `- ${f}`).join('\n')}\nDeliver a practical developer tip with code/syntax context.`,
  },
  build_in_public: {
    format: 'build_in_public',
    systemDirective: 'Write a transparent build-in-public update: what was built, what broke or was challenging, and the actual takeaway.',
    userTemplate: (facts, angle, pillar) =>
      `Pillar: ${pillar}\nAngle: ${angle}\nFacts:\n${facts.map((f) => `- ${f}`).join('\n')}\nDeliver an authentic builder lesson.`,
  },
  opinion_with_reasoning: {
    format: 'opinion_with_reasoning',
    systemDirective: 'State a grounded technical opinion followed by objective architectural reasons. Never use fake controversy.',
    userTemplate: (facts, angle, pillar) =>
      `Pillar: ${pillar}\nAngle: ${angle}\nFacts:\n${facts.map((f) => `- ${f}`).join('\n')}\nDeliver reasoned technical discourse.`,
  },
  thread_draft: {
    format: 'thread_draft',
    systemDirective: 'Break down the concept into 3 to 5 sequential tweets: 1. Hook, 2-4. Deep technical explanation, 5. Summary & discussion prompt.',
    userTemplate: (facts, angle, pillar) =>
      `Pillar: ${pillar}\nAngle: ${angle}\nFacts:\n${facts.map((f) => `- ${f}`).join('\n')}\nDeliver a clean sequential thread.`,
  },
};
