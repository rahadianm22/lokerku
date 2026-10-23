"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

export type ToastData = { id: number; message: string; action?: { label: string; run: () => void } };

export function Toast({ toast, onDone }: { toast: ToastData | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, toast.action ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pointer-events-auto flex items-center gap-4 rounded-2xl bg-ink py-2.5 pr-2.5 pl-4 text-sm text-bg shadow-[var(--shadow-lg)]"
          >
            {toast.message}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.run();
                  onDone();
                }}
                className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
