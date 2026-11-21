import { describe, it, expect } from 'vitest';
import { CharacterValidator } from './character-validator.js';

describe('CharacterValidator', () => {
  it('counts standard ASCII characters', () => {
    const text = 'Hello world from XGrowth!';
    const res = CharacterValidator.validate(text);
    expect(res.charCount).toBe(25);
    expect(res.isValid).toBe(true);
    expect(res.remaining).toBe(280 - 25);
  });

  it('weights URLs as exactly 23 characters', () => {
    const url = 'https://some-very-long-domain-name.com/deep/path/to/resource?param=123&test=true';
    const text = `Read here: ${url}`;
    const res = CharacterValidator.validate(text);
    // 'Read here: ' is 11 chars + 23 URL chars = 34 chars
    expect(res.charCount).toBe(34);
    expect(res.isValid).toBe(true);
  });

  it('rejects text exceeding 280 characters', () => {
    const longText = 'x'.repeat(281);
    const res = CharacterValidator.validate(longText);
    expect(res.isValid).toBe(false);
    expect(res.remaining).toBe(-1);
  });
});
