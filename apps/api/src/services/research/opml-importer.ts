import { SafeFetcher } from './safe-fetcher.js';

export interface OpmlFeedOutline {
  name: string;
  url: string;
  category: string;
  type: string;
}

export class OpmlService {
  public static exportToOpml(
    sources: Array<{ name: string; url: string; category?: string; type?: string }>,
  ): string {
    const outlines = sources
      .map(
        (s) =>
          `      <outline text="${this.escapeXml(s.name)}" title="${this.escapeXml(s.name)}" type="rss" xmlUrl="${this.escapeXml(s.url)}" category="${this.escapeXml(s.category || 'General')}" />`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>XGrowth AI Research Feeds Export</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
    <outline text="Technology &amp; Engineering Feeds" title="Technology &amp; Engineering Feeds">
${outlines}
    </outline>
  </body>
</opml>`;
  }

  public static parseOpml(opmlXml: string): OpmlFeedOutline[] {
    const feeds: OpmlFeedOutline[] = [];
    const outlineRegex = /<outline\s+([^>]+)\/?>/gi;
    let match: RegExpExecArray | null;

    while ((match = outlineRegex.exec(opmlXml)) !== null) {
      const attributes = match[1] || '';
      const xmlUrlMatch = attributes.match(/xmlUrl=["']([^"']+)["']/i);
      if (!xmlUrlMatch || !xmlUrlMatch[1]) continue;

      const url = xmlUrlMatch[1].trim();
      if (!SafeFetcher.isSafeUrl(url)) continue;

      const textMatch = attributes.match(/text=["']([^"']+)["']/i);
      const titleMatch = attributes.match(/title=["']([^"']+)["']/i);
      const categoryMatch = attributes.match(/category=["']([^"']+)["']/i);

      const name = (titleMatch?.[1] || textMatch?.[1] || 'Imported Feed').trim();
      const category = (categoryMatch?.[1] || 'General').trim();

      feeds.push({
        name: this.unescapeXml(name),
        url,
        category: this.unescapeXml(category),
        type: 'rss',
      });
    }

    return feeds;
  }

  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static unescapeXml(safe: string): string {
    return safe
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }
}
