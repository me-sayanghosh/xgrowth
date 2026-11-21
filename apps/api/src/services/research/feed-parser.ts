import Parser from 'rss-parser';
import { SafeFetcher } from './safe-fetcher.js';

export interface ParsedFeedItem {
  title: string;
  link: string;
  pubDate?: string;
  contentSnippet?: string;
  categories?: string[];
}

export class FeedParserService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  public async parseFeedUrl(feedUrl: string): Promise<ParsedFeedItem[]> {
    if (!SafeFetcher.isSafeUrl(feedUrl)) {
      throw new Error(`Invalid or blocked feed URL: ${feedUrl}`);
    }

    const xml = await SafeFetcher.fetchText(feedUrl);
    return this.parseFeedXml(xml);
  }

  public async parseFeedXml(xml: string): Promise<ParsedFeedItem[]> {
    const feed = await this.parser.parseString(xml);

    return (feed.items || []).map((item) => ({
      title: (item.title || 'Untitled').trim(),
      link: (item.link || '').trim(),
      pubDate: item.pubDate || item.isoDate,
      contentSnippet: (item.contentSnippet || item.summary || '').trim(),
      categories: item.categories || [],
    }));
  }
}

export const feedParserService = new FeedParserService();
