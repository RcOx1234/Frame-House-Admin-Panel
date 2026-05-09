import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PanelTheme } from '../types/settings';

const LS_KEY = 'fh_theme';

type ThemeContextValue = {
  theme: PanelTheme;
  setTheme: (t: PanelTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<PanelTheme>(() => {
    const ls = localStorage.getItem(LS_KEY);
    if (ls === 'light' || ls === 'dark') return ls;
    return 'dark';
  });

  const setTheme = useCallback((t: PanelTheme) => {
    setThemeState(t);
    localStorage.setItem(LS_KEY, t);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
