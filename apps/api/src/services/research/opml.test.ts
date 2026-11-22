import { describe, it, expect } from 'vitest';
import { OpmlService } from './opml-importer.js';

describe('OPML Service Unit Tests', () => {
  const sampleSources = [
    {
      name: 'Martin Fowler & Architecture',
      url: 'https://martinfowler.com/feed.atom',
      category: 'Software Architecture',
      type: 'rss',
    },
    {
      name: 'Netflix TechBlog',
      url: 'https://netflixtechblog.com/feed',
      category: 'Cloud Infrastructure',
      type: 'rss',
    },
  ];

  it('exports sources to valid OPML 2.0 XML string with escaped characters', () => {
    const xml = OpmlService.exportToOpml(sampleSources);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<opml version="2.0">');
    expect(xml).toContain('Martin Fowler &amp; Architecture');
    expect(xml).toContain('xmlUrl="https://martinfowler.com/feed.atom"');
    expect(xml).toContain('category="Software Architecture"');
  });

  it('parses OPML XML and extracts feed definitions', () => {
    const sampleOpml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Subscriptions</title></head>
  <body>
    <outline text="Uber Engineering" title="Uber Engineering" type="rss" xmlUrl="https://www.uber.com/blog/engineering/rss/" category="Distributed Systems" />
    <outline text="Node.js Blog" title="Node.js Blog" type="rss" xmlUrl="https://nodejs.org/en/feed/blog.xml" category="Node.js" />
  </body>
</opml>`;

    const parsed = OpmlService.parseOpml(sampleOpml);
    expect(parsed.length).toBe(2);
    expect(parsed[0]?.name).toBe('Uber Engineering');
    expect(parsed[0]?.url).toBe('https://www.uber.com/blog/engineering/rss/');
    expect(parsed[0]?.category).toBe('Distributed Systems');
    expect(parsed[1]?.name).toBe('Node.js Blog');
  });

  it('filters out SSRF and loopback targets from OPML imports', () => {
    const maliciousOpml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Local Exploit" xmlUrl="http://127.0.0.1:8080/feed" />
    <outline text="AWS Metadata" xmlUrl="http://169.254.169.254/feed" />
    <outline text="Legitimate Feed" xmlUrl="https://example.com/feed.xml" />
  </body>
</opml>`;

    const parsed = OpmlService.parseOpml(maliciousOpml);
    expect(parsed.length).toBe(1);
    expect(parsed[0]?.url).toBe('https://example.com/feed.xml');
  });
});
