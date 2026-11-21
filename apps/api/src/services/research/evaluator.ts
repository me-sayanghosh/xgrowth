export class ResearchEvaluator {
  public static calculateFreshness(pubDate?: string | Date, maxAgeHours = 72): number {
    if (!pubDate) {
      return 2; // unknown date given neutral/low score
    }

    const publishedTime = new Date(pubDate).getTime();
    const now = Date.now();
    const ageHours = Math.max(0, (now - publishedTime) / (1000 * 60 * 60));

    if (ageHours <= 12) return 5;
    if (ageHours <= 24) return 4;
    if (ageHours <= 48) return 3;
    if (ageHours <= maxAgeHours) return 2;
    return 1;
  }

  public static calculateCredibility(
    url: string,
    allowlist: string[] = [],
    configuredScore?: number,
  ): number {
    if (configuredScore && configuredScore >= 1 && configuredScore <= 5) {
      return configuredScore;
    }

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      // Check allowlist
      if (allowlist.some((domain) => host.includes(domain.toLowerCase()))) {
        return 5;
      }

      // Default scoring heuristics
      if (host.endsWith('.edu') || host.endsWith('.gov') || host.includes('github.com')) {
        return 5;
      }
      if (host.includes('developer.') || host.includes('docs.') || host.includes('aws.') || host.includes('google.')) {
        return 5;
      }

      return 3;
    } catch {
      return 1;
    }
  }

  public static calculateRelevance(title: string, snippet: string, pillars: string[]): number {
    const text = `${title} ${snippet}`.toLowerCase();
    let matches = 0;

    for (const pillar of pillars) {
      const words = pillar.toLowerCase().split(/[\s,]+/);
      for (const word of words) {
        if (word.length > 2 && text.includes(word)) {
          matches++;
        }
      }
    }

    if (matches >= 4) return 5;
    if (matches >= 2) return 4;
    if (matches >= 1) return 3;
    return 2;
  }
}
