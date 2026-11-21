import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AppState {
  globalPause: boolean;
  activeView: string;
  setGlobalPause: (paused: boolean) => void;
  setActiveView: (view: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [globalPause, setGlobalPause] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<string>('dashboard');

  useEffect(() => {
    // Fetch initial settings from API
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.globalPause === 'boolean') {
          setGlobalPause(data.globalPause);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <AppContext.Provider value={{ globalPause, activeView, setGlobalPause, setActiveView }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
