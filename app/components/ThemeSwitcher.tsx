'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/lib/theme/use-theme';
import { THEME_MODES, COLOR_SCHEMES } from '@/lib/theme/constants';

/**
 * Theme Switcher Component
 * Allows users to switch between light/dark/auto modes and color schemes
 */
export function ThemeSwitcher() {
  const { mode, scheme, setMode, setScheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const modeLabels: Record<typeof mode, string> = {
    light: 'Light',
    dark: 'Dark',
    auto: 'Auto',
  };

  const schemeColors: Record<typeof scheme, { bg: string; border: string }> = {
    blue: { bg: '#00C0FF', border: '#00C0FF' },
    green: { bg: '#10B981', border: '#10B981' },
    purple: { bg: '#BC8CFF', border: '#BC8CFF' },
    orange: { bg: '#F59E0B', border: '#F59E0B' },
  };

  // Calculate dropdown position
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="theme-switcher">
        <span style={{ fontSize: '1.1rem' }}>🌙</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Theme
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="theme-switcher-button"
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>
          {mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '🔄'}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Theme
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
            }}
          />

          {/* Dropdown */}
          <div
            style={{
      position: 'absolute',                                                                               
      top: 'calc(100% + 8px)',                                                                            
      right: 0,  
              width: '200px',
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
              zIndex: 9999,
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Theme Mode Section */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '8px',
                }}
              >
                Mode
              </div>
              {THEME_MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    borderRadius: '8px',
                    background: mode === m ? 'rgba(0, 192, 255, 0.1)' : 'transparent',
                    color: 'var(--text)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (mode !== m) {
                      e.currentTarget.style.background = 'var(--surface-light)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (mode !== m) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>
                    {m === 'light' ? '☀️' : m === 'dark' ? '🌙' : '🔄'}
                  </span>
                  {modeLabels[m]}
                  {mode === m && (
                    <span style={{ marginLeft: 'auto', color: 'var(--primary)' }}>✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Color Scheme Section */}
            <div>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '8px',
                }}
              >
                Color Scheme
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {COLOR_SCHEMES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setScheme(s);
                      setIsOpen(false);
                    }}
                    style={{
                      flex: 1,
                      aspectRatio: '1',
                      border: '2px solid',
                      borderColor: scheme === s ? schemeColors[s].border : 'var(--border)',
                      borderRadius: '8px',
                      background: schemeColors[s].bg,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (scheme !== s) {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {scheme === s && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: 'white',
                          fontSize: '1.2rem',
                          textShadow: '0 0 8px rgba(0, 0, 0, 0.5)',
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
