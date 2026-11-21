import { URL } from 'url';

export class TopicDeduplicator {
  public static normalizeUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      parsed.hash = '';
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      parsed.searchParams.delete('utm_term');
      parsed.searchParams.delete('utm_content');
      parsed.searchParams.delete('ref');
      return parsed.toString().replace(/\/+$/, '');
    } catch {
      return rawUrl.trim();
    }
  }

  public static isSimilarTitle(titleA: string, titleB: string, threshold = 0.65): boolean {
    const wordsA = new Set(titleA.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
    const wordsB = new Set(titleB.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));

    if (wordsA.size === 0 || wordsB.size === 0) return false;

    let intersectionCount = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) {
        intersectionCount++;
      }
    }

    const unionCount = wordsA.size + wordsB.size - intersectionCount;
    const jaccard = intersectionCount / unionCount;

    return jaccard >= threshold;
  }
}
