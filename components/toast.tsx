"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastData = { id: number; message: string; undo?: () => void };
type Show = (message: string, undo?: () => void) => void;

const Ctx = createContext<Show>(() => {});
export const useToast = () => useContext(Ctx);

/** Satu toast sekaligus. Hilang sendiri setelah 5 detik, berhenti saat di-hover atau difokus. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [paused, setPaused] = useState(false);
  const seq = useRef(0);

  const show = useCallback<Show>((message, undo) => {
    seq.current += 1;
    setToast({ id: seq.current, message, undo });
  }, []);

  useEffect(() => {
    if (!toast || paused) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast, paused]);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              className={`toast${toast.undo ? "" : " plain"}`}
              initial={{ opacity: 0, y: 18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.16 } }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
            >
              <span className="msg">
                <Check className="ic" strokeWidth={2} aria-hidden />
                {toast.message}
              </span>
              {toast.undo && (
                <button
                  type="button"
                  className="toast-undo"
                  onClick={() => {
                    toast.undo?.();
                    setToast(null);
                    setPaused(false);
                  }}
                >
                  Batalkan
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
