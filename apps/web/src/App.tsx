import { AppProvider, useApp } from './context/AppContext.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { EmergencyPauseBanner } from './components/common/EmergencyPauseBanner.js';
import { DashboardView } from './views/DashboardView.js';
import { ResearchInboxView } from './views/ResearchInboxView.js';
import { ContentStudioView } from './views/ContentStudioView.js';
import { ReviewQueueView } from './views/ReviewQueueView.js';
import { EditorialCalendarView } from './views/EditorialCalendarView.js';
import { BufferChannelsView } from './views/BufferChannelsView.js';
import { AnalyticsView } from './views/AnalyticsView.js';
import { SettingsView } from './views/SettingsView.js';
import { AuditLogView } from './views/AuditLogView.js';

function AppContent() {
  const { activeView } = useApp();

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'research':
        return <ResearchInboxView />;
      case 'studio':
        return <ContentStudioView />;
      case 'queue':
        return <ReviewQueueView />;
      case 'calendar':
        return <EditorialCalendarView />;
      case 'buffer':
        return <BufferChannelsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      case 'audit':
        return <AuditLogView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <AppLayout>
      <EmergencyPauseBanner />
      {renderView()}
    </AppLayout>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
