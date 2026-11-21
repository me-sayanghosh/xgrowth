export interface LintResult {
  passed: boolean;
  qualityFlags: string[];
  riskFlags: string[];
}

export class ToneLinter {
  private static BUZZWORDS = [
    'game-changer',
    'mind-blowing',
    'revolutionize',
    'insane results',
    'secret sauce',
    '10x developer',
  ];

  public static lintDraft(text: string, threadParts: string[] = []): LintResult {
    const qualityFlags: string[] = [];
    const riskFlags: string[] = [];

    const fullContent = [text, ...threadParts].join(' ');
    const lower = fullContent.toLowerCase();

    // 1. Check for buzzwords / hype
    for (const word of this.BUZZWORDS) {
      if (lower.includes(word)) {
        riskFlags.push(`Contains banned hype phrase: "${word}"`);
      }
    }

    // 2. Check for hashtag stuffing
    const hashtags = fullContent.match(/#[a-zA-Z0-9_]+/g) || [];
    if (hashtags.length > 2) {
      riskFlags.push(`Hashtag stuffing detected: ${hashtags.length} hashtags (max recommended: 2).`);
    }

    // 3. Check for engagement bait
    const baitPhrases = ['like and retweet', 'drop a comment if you agree', 'retweet to save a life'];
    for (const bait of baitPhrases) {
      if (lower.includes(bait)) {
        riskFlags.push(`Engagement bait detected: "${bait}"`);
      }
    }

    // 4. Quality checks
    if (text.length > 50 && !riskFlags.length) {
      qualityFlags.push('Clear and specific tone');
    }
    if (text.includes('```') || text.includes('const ') || text.includes('import ')) {
      qualityFlags.push('Contains technical code reference');
    }

    return {
      passed: riskFlags.length === 0,
      qualityFlags,
      riskFlags,
    };
  }
}
