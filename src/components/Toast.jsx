import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

const TOAST_STYLES = {
  success: 'bg-emerald-950/95 border-emerald-700/40 text-emerald-300',
  error: 'bg-red-950/95 border-red-700/40 text-red-300',
  info: 'bg-[#0e1218]/95 border-[#2a2f3c] text-[#ada692]',
};

const PROGRESS_STYLES = {
  success: 'bg-emerald-500/60',
  error: 'bg-red-500/60',
  info: 'bg-[#d4b13c]/60',
};

const ICONS = {
  success: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  error:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 13h-2v-2h2v2zm0-4h-2V7h2v4z',
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
};

const STYLES = `
@keyframes _toast-in {
  from { opacity: 0; transform: translateY(20px) scale(0.94); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
@keyframes _toast-out {
  from { opacity: 1; transform: translateY(0)    scale(1);    }
  to   { opacity: 0; transform: translateY(12px) scale(0.96); }
}
@keyframes _toast-progress {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}
._toast-in  { animation: _toast-in  0.32s cubic-bezier(0.34, 1.4, 0.64, 1) forwards; }
._toast-out { animation: _toast-out 0.28s ease-in forwards; }
._toast-progress { animation: _toast-progress 3.5s linear forwards; transform-origin: left; }
`;

function ToastStyles() {
  useEffect(() => {
    if (document.getElementById('_toast-styles')) return;
    const style = document.createElement('style');
    style.id = '_toast-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);
  return null;
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <>
      <ToastStyles />
      <div className="fixed bottom-24 left-0 right-0 z-[600] flex flex-col items-center gap-2 px-4 pointer-events-none md:bottom-6 md:items-end md:right-6 md:left-auto md:w-80">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`_toast-${toast.exiting ? 'out' : 'in'} pointer-events-auto flex w-full max-w-sm flex-col rounded-xl border shadow-2xl backdrop-blur-md overflow-hidden ${TOAST_STYLES[toast.type]}`}
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <svg
                viewBox="0 0 24 24"
                className="mt-px h-4 w-4 shrink-0"
                fill="currentColor"
              >
                <path d={ICONS[toast.type]} />
              </svg>
              <p className="flex-1 text-sm font-medium leading-snug">
                {toast.message}
              </p>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            {!toast.exiting && (
              <div className="h-0.5 w-full">
                <div
                  className={`_toast-progress h-full w-full ${PROGRESS_STYLES[toast.type]}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    // Marca como "exiting" para animar la salida
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );

    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    // Remueve después de la animación de salida (300ms)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const push = useCallback(
    (message, type) => {
      const id = toastId++;
      // Máximo 5 toasts visibles
      setToasts((prev) => [
        ...prev.slice(-4),
        { id, message, type, exiting: false },
      ]);
      // Auto-dismiss a los 3.5s
      timersRef.current.set(id, setTimeout(() => dismiss(id), 3500));
    },
    [dismiss]
  );

  const value = {
    success: (msg) => push(msg, 'success'),
    error: (msg) => push(msg, 'error'),
    info: (msg) => push(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}