import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface AppState {
  globalPause: boolean;
  activeView: string;
  authToken: string;
  setGlobalPause: (paused: boolean) => void;
  setActiveView: (view: string) => void;
  setAuthToken: (token: string) => void;
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [globalPause, setGlobalPause] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [authToken, setAuthTokenState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('xgrowth_token') || 'dev-owner-token';
    }
    return 'dev-owner-token';
  });

  const setAuthToken = (token: string) => {
    setAuthTokenState(token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('xgrowth_token', token);
    }
  };

  const apiFetch = useCallback(
    async (url: string, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${authToken}`);
      }
      if (!headers.has('x-xgrowth-csrf')) {
        headers.set('x-xgrowth-csrf', '1');
      }

      return fetch(url, {
        ...init,
        headers,
      });
    },
    [authToken],
  );

  useEffect(() => {
    // Fetch initial settings from API using authenticated fetch
    apiFetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.globalPause === 'boolean') {
          setGlobalPause(data.globalPause);
        }
      })
      .catch(() => {});
  }, [apiFetch]);

  return (
    <AppContext.Provider
      value={{
        globalPause,
        activeView,
        authToken,
        setGlobalPause,
        setActiveView,
        setAuthToken,
        apiFetch,
      }}
    >
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
