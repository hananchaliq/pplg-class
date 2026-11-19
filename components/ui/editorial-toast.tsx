"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { MOTION_EASE } from "@/lib/motion-tokens";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
}

export interface ToastOptions {
  title?: string;
  description: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  pushToast: (message: string, variant?: ToastVariant) => void;
  toast: (options: ToastOptions) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function EditorialToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addToast = React.useCallback(
    (message: string, variant: ToastVariant = "info", title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, title, message, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4200);
    },
    []
  );

  const pushToast = React.useCallback(
    (message: string, variant: ToastVariant = "info") => {
      addToast(message, variant);
    },
    [addToast]
  );

  const toast = React.useCallback(
    (options: ToastOptions) => {
      addToast(options.description, options.variant ?? "info", options.title);
    },
    [addToast]
  );

  const value = React.useMemo(
    () => ({ pushToast, toast }),
    [pushToast, toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed right-3 bottom-20 z-[85] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-2 sm:right-5 sm:bottom-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={MOTION_EASE.springToast}
              className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-border bg-card/95 px-3.5 py-3 text-card-foreground shadow-lg backdrop-blur-md"
            >
              {item.variant === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-foreground" />
              ) : item.variant === "error" ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              ) : (
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                {item.title && (
                  <p className="font-sans text-xs font-semibold text-foreground">
                    {item.title}
                  </p>
                )}
                <p className="font-sans text-xs leading-relaxed text-foreground/90">
                  {item.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Tutup notifikasi"
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useEditorialToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      pushToast: () => {},
      toast: () => {},
    };
  }
  return ctx;
}
