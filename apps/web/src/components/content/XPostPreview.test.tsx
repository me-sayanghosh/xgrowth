import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { XPostPreview } from './XPostPreview.js';
import { ThreadVisualizer } from './ThreadVisualizer.js';

describe('XPostPreview & ThreadVisualizer Component Tests', () => {
  describe('XPostPreview', () => {
    it('renders tweet text, author info, and platform preview styling', () => {
      const html = renderToString(
        <XPostPreview
          text="Testing distributed consensus with #Raft and #Paxos on https://example.com"
          authorName="Sayang Ghosh"
          handle="sayang"
        />,
      );

      expect(html).toContain('Sayang Ghosh');
      expect(html).toContain('@sayang');
      expect(html).toContain('Draft Preview');
      expect(html).toContain('#Raft');
      expect(html).toContain('#Paxos');
      expect(html).toContain('https://example.com');
      // SVG circular gauge
      expect(html).toContain('<svg');
      expect(html).toContain('circle');
    });

    it('renders thread indicator badge when part of a multi-tweet thread', () => {
      const html = renderToString(
        <XPostPreview
          text="This is tweet 2 of 4 in an engineering breakdown."
          threadIndex={1}
          totalParts={4}
        />,
      );

      expect(html).toContain('2/4');
    });

    it('highlights character warning when character count exceeds threshold', () => {
      const longPost = 'A'.repeat(270);
      const html = renderToString(<XPostPreview text={longPost} />);

      // Under 280, remaining = 10 chars
      expect(html).toContain('10');
    });
  });

  describe('ThreadVisualizer', () => {
    it('renders all sequential thread parts with connecting timeline elements', () => {
      const parts = [
        'Tweet 1: Introduction to Raft consensus.',
        'Tweet 2: Leader election and heartbeat intervals.',
        'Tweet 3: Log replication and safety invariant verification.',
      ];

      const html = renderToString(
        <ThreadVisualizer parts={parts} onChange={vi.fn()} readOnly />,
      );

      expect(html).toContain('Thread Breakdown (3 tweets)');
      expect(html).toContain('Raft');
      expect(html).toContain('heartbeat');
      expect(html).toContain('replication');
      // Indices 1/3, 2/3, 3/3
      expect(html).toContain('1/3');
      expect(html).toContain('2/3');
      expect(html).toContain('3/3');
    });
  });
});
