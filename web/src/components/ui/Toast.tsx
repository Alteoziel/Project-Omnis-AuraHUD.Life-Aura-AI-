"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastAction = {
  id: number;
  message: string;
  undo?: () => void;
};

type ToastApi = {
  show: (message: string, undo?: () => void) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastAction[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, undo?: () => void) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, undo }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex min-h-tap w-full max-w-md items-center justify-between gap-3 rounded-pill border border-white/10 bg-ink/90 px-4 py-3 text-sm text-white shadow-glow backdrop-blur-md"
          >
            <p>{toast.message}</p>
            {toast.undo ? (
              <button
                type="button"
                className="min-h-tap font-semibold text-ice"
                onClick={() => {
                  toast.undo?.();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
              >
                Undo
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}
