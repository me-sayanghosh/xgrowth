import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { App } from './App.js';
import { EmergencyPauseBanner } from './components/common/EmergencyPauseBanner.js';
import { AppProvider } from './context/AppContext.js';
import { AppLayout } from './components/layout/AppLayout.js';

describe('App Component and Shell Tests', () => {
  beforeEach(() => {
    // Mock global fetch for API calls in React components
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ globalPause: true, brandPillars: ['Engineering'] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('renders the complete application shell without crashing', () => {
    const html = renderToString(<App />);
    expect(html).toContain('XGrowth AI');
    expect(html).toContain('PAUSED');
    expect(html).toContain('Dashboard');
    expect(html).toContain('Review Queue');
  });

  it('renders the Emergency Pause Banner in active state by default', () => {
    const html = renderToString(
      <AppProvider>
        <EmergencyPauseBanner />
      </AppProvider>
    );
    expect(html).toContain('Global Emergency Pause is ACTIVE');
    expect(html).toContain('External Buffer submissions are blocked. Local drafting and research remain active.');
  });

  it('renders navigation bar links across all views', () => {
    const html = renderToString(
      <AppProvider>
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      </AppProvider>
    );
    expect(html).toContain('Research Desk');
    expect(html).toContain('Content Studio');
    expect(html).toContain('Editorial Calendar');
    expect(html).toContain('Buffer Connector');
    expect(html).toContain('Analytics &amp; Reports');
    expect(html).toContain('Brand Settings');
    expect(html).toContain('Audit Log');
    expect(html).toContain('Test Content');
  });
});
