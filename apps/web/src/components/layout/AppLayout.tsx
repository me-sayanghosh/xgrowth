import React from 'react';
import { useApp } from '../../context/AppContext.js';
import {
  LayoutDashboard,
  Inbox,
  PenTool,
  CheckCircle2,
  Calendar,
  Share2,
  BarChart3,
  Settings,
  ScrollText,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'research', label: 'Research Desk', icon: Inbox },
  { id: 'studio', label: 'Content Studio', icon: PenTool },
  { id: 'queue', label: 'Review Queue', icon: CheckCircle2 },
  { id: 'calendar', label: 'Editorial Calendar', icon: Calendar },
  { id: 'buffer', label: 'Buffer Connector', icon: Share2 },
  { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { id: 'settings', label: 'Brand Settings', icon: Settings },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { activeView, setActiveView, globalPause } = useApp();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              XGrowth AI
            </span>
          </div>
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
              globalPause ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            }`}
          >
            {globalPause ? 'PAUSED' : 'LIVE'}
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          Buffer-first Architecture • v0.1.0
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
