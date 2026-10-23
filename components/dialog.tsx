"use client";

import { X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useMedia } from "@/hooks/use-media";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Dialog aksesibel: aria-modal, focus trap, Esc, klik scrim, bottom sheet di mobile. */
export function Dialog({
  eyebrow,
  title,
  onClose,
  footer,
  children,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const mobile = useMedia("(max-width: 760px)");
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      closeRef.current();
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panel.current) return;
    const list = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const enter = mobile
    ? { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" }, transition: { duration: 0.46, ease: [0.2, 0.9, 0.25, 1.04] as const } }
    : {
        initial: { opacity: 0, y: 32, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.18 } },
        transition: { type: "spring" as const, stiffness: 380, damping: 30 },
      };

  return (
    <>
      <motion.div className="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} aria-hidden="true" />
      <div
        className="ov-wrap"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          ref={panel}
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lk-dlg-title"
          tabIndex={-1}
          style={{ outline: "none" }}
          onKeyDown={trap}
          {...enter}
        >
          <div className="grab" aria-hidden="true" />
          <div className="m-head">
            <div style={{ minWidth: 0 }}>
              <p className="eyebrow">{eyebrow}</p>
              <h2 id="lk-dlg-title">{title}</h2>
            </div>
            <button type="button" className="close" onClick={onClose} aria-label="Tutup">
              <X className="ic" width={18} height={18} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
          <div className="m-body">{children}</div>
          {footer && <div className="m-foot">{footer}</div>}
        </motion.div>
      </div>
    </>
  );
}
