'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    error: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    info: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    warning: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  };

  const colors = {
    success: { bg: '#E8F8EE', border: '#2ECC71', text: '#2ECC71' },
    error: { bg: '#FDEDEC', border: '#E74C3C', text: '#E74C3C' },
    info: { bg: '#EBF0FF', border: '#A2A7FF', text: '#6366F1' },
    warning: { bg: '#FEF5E7', border: '#F39C12', text: '#F39C12' },
  };

  const color = colors[type];

  return (
    <div
      className="toast"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        padding: '16px 20px',
        background: color.bg,
        border: '2px solid #000000',
        borderRadius: '16px',
        color: color.text,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontWeight: 600,
        fontSize: '0.95rem',
        boxShadow: '3px 3px 0px 0px #000000',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'all 0.3s ease',
        maxWidth: '400px',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {icons[type]}
      </div>
      <div style={{ flex: 1 }}>
        {message}
      </div>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onClose?.(), 300);
        }}
        style={{
          background: '#fff',
          border: '2px solid #000',
          borderRadius: '8px',
          color: 'inherit',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.6,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// Simple toast manager using a global state
let toastQueue: Array<{ id: number; message: string; type: ToastType }> = [];
let toastListeners: Set<(toasts: typeof toastQueue) => void> = new Set();
let toastIdCounter = 0;

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toastQueue]));
}

export function showToast(message: string, type: ToastType = 'info', duration = 3000) {
  const id = toastIdCounter++;
  const toast = { id, message, type };
  toastQueue.push(toast);
  notifyListeners();

  setTimeout(() => {
    removeToast(id);
  }, duration);
}

export function removeToast(id: number) {
  toastQueue = toastQueue.filter(t => t.id !== id);
  notifyListeners();
}

export function useToast() {
  const [toasts, setToasts] = useState<typeof toastQueue>([]);

  useEffect(() => {
  const listener = (newToasts: typeof toastQueue) => {
    setToasts(newToasts);
  };

  toastListeners.add(listener);

  return () => {
    toastListeners.delete(listener);
  };
}, []);

  return { toasts, showToast, removeToast };
}
