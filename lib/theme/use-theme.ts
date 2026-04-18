/**
 * useTheme hook
 */

import { useContext } from 'react';
import { ThemeContext } from './context';
import type { ThemeContextValue } from './types';

/**
 * Hook to access theme context
 * @returns Theme context value
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
