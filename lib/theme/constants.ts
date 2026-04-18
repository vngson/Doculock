/**
 * Theme system constants
 */

import type { ThemeMode, ColorScheme, ThemeState } from './types';

export const LOCAL_STORAGE_THEME_KEY = 'doculock-theme';
export const LOCAL_STORAGE_SCHEME_KEY = 'doculock-color-scheme';

export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'auto'] as const;

export const COLOR_SCHEMES: readonly ColorScheme[] = ['blue', 'green', 'purple', 'orange'] as const;

export const DEFAULT_THEME_MODE: ThemeMode = 'dark';

export const DEFAULT_COLOR_SCHEME: ColorScheme = 'blue';

export const DEFAULT_THEME_STATE: ThemeState = {
  mode: DEFAULT_THEME_MODE,
  scheme: DEFAULT_COLOR_SCHEME,
};

export const THEME_COLORS = {
  blue: {
    primary: '#00C0FF',
    primaryHover: '#00D4FF',
    secondary: '#BC8CFF',
  },
  green: {
    primary: '#10B981',
    primaryHover: '#34D399',
    secondary: '#F59E0B',
  },
  purple: {
    primary: '#BC8CFF',
    primaryHover: '#D8B4FE',
    secondary: '#F59E0B',
  },
  orange: {
    primary: '#F59E0B',
    primaryHover: '#FBBF24',
    secondary: '#00C0FF',
  },
} as const;
