import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AnalyticsView } from './AnalyticsView.js';

describe('AnalyticsView Component Tests', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/analytics/reports')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 'rep-test-123',
                markdownReport: '# Weekly X Content Report\n\n- Posts: 5\n',
                generatedAt: new Date().toISOString(),
                totalPublished: 5,
                whatWorked: ['Tip posts had highest engagement'],
                nextExperiments: ['Test code snippets'],
                wowDeltas: {
                  posts: { current: 5, previous: 4, delta: 1, deltaPercent: 25 },
                  likes: { current: 120, previous: 100, delta: 20, deltaPercent: 20 },
                  reposts: { current: 15, previous: 20, delta: -5, deltaPercent: -25 },
                  replies: { current: 8, previous: 8, delta: 0, deltaPercent: 0 },
                },
              },
            ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('renders analytics shell and header controls without crashing', () => {
    const html = renderToString(<AnalyticsView />);
    expect(html).toContain('Analytics &amp; Weekly Insights');
    expect(html).toContain('Generate New Weekly Report');
  });
});
