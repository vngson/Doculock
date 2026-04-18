'use client';

/**
 * Theme context and provider
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { ThemeMode, ColorScheme, ResolvedTheme, ThemeState, ThemeContextValue } from './types';
import { DEFAULT_THEME_STATE } from './constants';
import {
  getThemeFromStorage,
  saveThemeToStorage,
  applyTheme,
  resolveTheme,
  createSystemThemeListener,
} from './utils';

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  defaultScheme?: ColorScheme;
}

/**
 * Theme Provider - Wraps app with theme functionality
 */
export function ThemeProvider({
  children,
  defaultMode = DEFAULT_THEME_STATE.mode,
  defaultScheme = DEFAULT_THEME_STATE.scheme,
}: ThemeProviderProps) {
  const [state, setState] = useState<ThemeState>(() => {
    const saved = getThemeFromStorage();
    return {
      mode: saved.mode || defaultMode,
      scheme: saved.scheme || defaultScheme,
    };
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(state.mode)
  );

  // Update DOM when theme changes
  useEffect(() => {
    applyTheme(state.mode, state.scheme);
    saveThemeToStorage(state);
  }, [state]);

  // Update resolved theme when mode or system preference changes
  useEffect(() => {
    const updateResolved = () => {
      setResolvedTheme(resolveTheme(state.mode));
    };

    // Initial update
    updateResolved();

    // Listen for system theme changes if in auto mode
    if (state.mode === 'auto') {
      const cleanup = createSystemThemeListener(updateResolved);
      return cleanup;
    }
  }, [state.mode]);

  const setMode = (mode: ThemeMode) => {
    setState(prev => ({ ...prev, mode }));
  };

  const setScheme = (scheme: ColorScheme) => {
    setState(prev => ({ ...prev, scheme }));
  };

  const toggleTheme = () => {
    setMode(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const value: ThemeContextValue = {
    mode: state.mode,
    scheme: state.scheme,
    resolvedTheme,
    setMode,
    setScheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Export context for use in useTheme hook
 */
export { ThemeContext };
