/**
 * Theme system types
 */

export type ThemeMode = 'light' | 'dark' | 'auto';

export type ColorScheme = 'blue' | 'green' | 'purple' | 'orange';

export type ResolvedTheme = 'light' | 'dark';

export interface ThemeState {
  mode: ThemeMode;
  scheme: ColorScheme;
}

export interface ThemeContextValue {
  mode: ThemeMode;
  scheme: ColorScheme;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  setScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
}
