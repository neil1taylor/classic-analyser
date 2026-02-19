import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { createLogger } from '@/utils/logger';
import type { InfrastructureDomain } from '@/contexts/AuthContext';

const log = createLogger('UI');

export type CarbonTheme = 'white' | 'g100';

interface UIContextValue {
  sideNavExpanded: boolean;
  activeResourceType: string | null;
  theme: CarbonTheme;
  chatPanelOpen: boolean;
  activeDomain: InfrastructureDomain;
  toggleSideNav: () => void;
  setActiveResourceType: (type: string | null) => void;
  toggleTheme: () => void;
  toggleChatPanel: () => void;
  setActiveDomain: (domain: InfrastructureDomain) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

function getInitialTheme(): CarbonTheme {
  const stored = localStorage.getItem('theme');
  if (stored === 'white' || stored === 'g100') return stored;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'g100';
  return 'white';
}

function domainFromPath(pathname: string): InfrastructureDomain {
  if (pathname.startsWith('/vpc')) return 'vpc';
  if (pathname.startsWith('/powervs')) return 'powervs';
  return 'classic';
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sideNavExpanded, setSideNavExpanded] = useState(true);
  const [activeResourceType, setActiveResourceTypeState] = useState<string | null>(null);
  const [theme, setTheme] = useState<CarbonTheme>(getInitialTheme);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [domainOverride, setDomainOverride] = useState<InfrastructureDomain | null>(null);

  const activeDomain = useMemo(
    () => domainOverride ?? domainFromPath(location.pathname),
    [domainOverride, location.pathname],
  );

  // Clear override when URL changes to a different domain
  useEffect(() => {
    const urlDomain = domainFromPath(location.pathname);
    if (domainOverride && urlDomain !== domainOverride) {
      setDomainOverride(null);
    }
  }, [location.pathname, domainOverride]);

  useEffect(() => {
    document.documentElement.dataset.carbonTheme = theme;
  }, [theme]);

  const toggleSideNav = useCallback(() => {
    setSideNavExpanded((prev) => !prev);
  }, []);

  const setActiveResourceType = useCallback((type: string | null) => {
    setActiveResourceTypeState(type);
  }, []);

  const toggleChatPanel = useCallback(() => {
    setChatPanelOpen((prev) => !prev);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'white' ? 'g100' : 'white';
      localStorage.setItem('theme', next);
      log.info('Theme switched to', next);
      return next;
    });
  }, []);

  const setActiveDomain = useCallback((domain: InfrastructureDomain) => {
    setDomainOverride(domain);
  }, []);

  const value: UIContextValue = {
    sideNavExpanded,
    activeResourceType,
    theme,
    chatPanelOpen,
    activeDomain,
    toggleSideNav,
    setActiveResourceType,
    toggleTheme,
    toggleChatPanel,
    setActiveDomain,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export default UIContext;
