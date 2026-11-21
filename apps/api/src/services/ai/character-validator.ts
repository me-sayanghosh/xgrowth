export interface CharacterCountResult {
  charCount: number;
  remaining: number;
  isValid: boolean;
  maxLimit: number;
}

export class CharacterValidator {
  public static readonly X_MAX_CHARS = 280;
  public static readonly URL_WEIGHT = 23; // Twitter/X standard t.co link length

  public static calculateXLength(text: string): number {
    // Replace URLs with placeholder of length 23
    const urlRegex = /https?:\/\/[^\s]+/g;
    const textWithoutUrls = text.replace(urlRegex, 'X'.repeat(this.URL_WEIGHT));

    // Handle code points (emojis, CJK, etc.)
    let length = 0;
    for (const char of textWithoutUrls) {
      const code = char.codePointAt(0) || 0;
      // Normal ASCII and Latin ranges count as 1 char
      if (code <= 0x10ff) {
        length += 1;
      } else {
        // CJK / extended range counts as 2 chars
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
