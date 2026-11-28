export interface CharacterCountResult {
  charCount: number;
  remaining: number;
  isValid: boolean;
  maxLimit: number;
}

/**
 * Validates post length against X (Twitter) character counting rules (23-char t.co URLs, 2-char wide glyphs).
 */
export class CharacterValidator {
  public static readonly X_MAX_CHARS = 280;
  public static readonly URL_WEIGHT = 23;

  public static calculateXLength(text: string): number {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const textWithoutUrls = text.replace(urlRegex, 'X'.repeat(this.URL_WEIGHT));

    let length = 0;
    for (const char of textWithoutUrls) {
      const code = char.codePointAt(0) || 0;
      if (code <= 0x10ff) {
        length += 1;
      } else {
        length += 2;
      }
    }

    return length;
  }

  public static validate(text: string, maxLimit = CharacterValidator.X_MAX_CHARS): CharacterCountResult {
    const charCount = this.calculateXLength(text);
    return {
      charCount,
      remaining: maxLimit - charCount,
      isValid: charCount > 0 && charCount <= maxLimit,
      maxLimit,
    };
  }
}
