'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  exiting?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);

    // Start exit animation after 3s
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    }, 3000);

    // Remove after animation completes
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3300);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm max-w-sm ${
              toast.exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
            } ${
              toast.type === 'success'
                ? 'bg-green-900/90 border-green-500/50 text-green-200'
                : toast.type === 'error'
                ? 'bg-red-900/90 border-red-500/50 text-red-200'
                : 'bg-gray-800/90 border-gray-600/50 text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 text-sm">
              <span>
                {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
              </span>
              <span>{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
