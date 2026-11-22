import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildUserPrompt,
  getLanguageDirective,
  PROMPT_TEMPLATES,
} from './prompts.js';

describe('Prompts & Multi-Language Templates', () => {
  it('returns English directive by default', () => {
    const directive = getLanguageDirective('en');
    expect(directive).toContain('Language: English');
  });

  it('returns Bengali directive for bn language option', () => {
    const directive = getLanguageDirective('bn');
    expect(directive).toContain('Language: Bengali (বাংলা)');
    expect(directive).toContain('Retain standardized industry terms');
  });

  it('returns mixed English-Bengali directive for mixed language option', () => {
    const directive = getLanguageDirective('mixed');
    expect(directive).toContain('Language: Mixed English & Bengali (Benglish)');
  });

  it('builds system prompt with format directive, voice traits, avoid list, and language target', () => {
    const prompt = buildSystemPrompt({
      format: 'opinion_with_reasoning',
      brandVoiceTraits: ['rigorous', 'humble'],
      brandVoiceAvoid: ['hype', 'viral hacks'],
      language: 'bn',
    });

    expect(prompt).toContain('Never use fake controversy');
    expect(prompt).toContain('Brand Voice Traits: rigorous, humble');
    expect(prompt).toContain('Avoid: hype, viral hacks');
    expect(prompt).toContain('Language: Bengali (বাংলা)');
  });

  it('builds user prompt with facts, angle, pillar, and format', () => {
    const userPrompt = buildUserPrompt({
      topic: 'Raft Consensus',
      topicPillar: 'Distributed Systems',
      whyItMatters: 'Guarantees state machine replication safely',
      verifiedFacts: ['Heartbeats maintain leader authority', 'Term numbers detect stale leaders'],
      format: 'single_post',
      variantCount: 3,
      language: 'mixed',
    });

    expect(userPrompt).toContain('Topic: Raft Consensus');
    expect(userPrompt).toContain('Language Target: mixed');
    expect(userPrompt).toContain('Heartbeats maintain leader authority');
    expect(userPrompt).toContain('Generate 3 distinct variants');
  });

  it('supports all required content formats', () => {
    const formats = Object.keys(PROMPT_TEMPLATES);
    expect(formats).toContain('single_post');
    expect(formats).toContain('educational_tip');
    expect(formats).toContain('build_in_public');
    expect(formats).toContain('opinion_with_reasoning');
    expect(formats).toContain('thread_draft');
  });
});
