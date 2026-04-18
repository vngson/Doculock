/**
 * Theme utility functions
 */

import type { ThemeMode, ColorScheme, ResolvedTheme, ThemeState } from './types';
import { DEFAULT_THEME_STATE } from './constants';

/**
 * Get system color scheme preference
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Resolve theme mode to actual theme
 */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'auto') {
    return getSystemTheme();
  }
  return mode;
}

/**
 * Get theme state from localStorage
 */
export function getThemeFromStorage(): ThemeState {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_STATE;
  }

  try {
    const mode = localStorage.getItem('doculock-theme') as ThemeMode | null;
    const scheme = localStorage.getItem('doculock-color-scheme') as ColorScheme | null;

    return {
      mode: mode || DEFAULT_THEME_STATE.mode,
      scheme: scheme || DEFAULT_THEME_STATE.scheme,
    };
  } catch {
    return DEFAULT_THEME_STATE;
  }
}

/**
 * Save theme state to localStorage
 */
export function saveThemeToStorage(state: ThemeState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('doculock-theme', state.mode);
    localStorage.setItem('doculock-color-scheme', state.scheme);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Apply theme to document
 */
export function applyTheme(mode: ThemeMode, scheme: ColorScheme): void {
  if (typeof document === 'undefined') return;

  const resolved = resolveTheme(mode);

  // Set theme attribute
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-scheme', scheme);
}

/**
 * Create a media query listener for system theme changes
 */
export function createSystemThemeListener(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };

  mediaQuery.addEventListener('change', handler);

  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
