"use client";

import { Database, Download, FileUp, House, LogIn, LogOut, Moon, MoreHorizontal, Plus, RefreshCw, Settings, Sheet, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import type { Account } from "@/lib/store";

interface Props {
  onAdd: () => void;
  onExportCsv: () => void;
  onBackup: () => void;
  onRestoreFile: (file: File) => void;
  account: Account | null;
  authEnabled: boolean;
  sheetUrl: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onSyncNow: () => void;
  onSettings: () => void;
  addRef: React.Ref<HTMLButtonElement>;
}

export function Header({ addRef, ...p }: Props) {
  const [open, setOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);

  // Item yang disembunyikan CSS (mis. "Ke beranda" di desktop) tidak boleh ikut navigasi panah.
  const items = () => [...(menu.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? [])].filter((el) => el.offsetParent !== null);
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length;
      list[next]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      list[e.key === "Home" ? 0 : list.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const select = (fn: () => void) => {
    close();
    fn();
  };

  return (
    <header className="hd">
      <div>
        <p className="eyebrow">pengumpul loker pribadi</p>
        <h1 className="wordmark">
          Loker<span className="mark">ku.</span>
        </h1>
      </div>
      <div className="hd-actions">
        <Link href="/" className="btn btn-ghost hide-m">
          <House className="ic" strokeWidth={1.75} aria-hidden />
          Beranda
        </Link>
        <button ref={addRef} type="button" className="btn btn-ink" onClick={p.onAdd} aria-keyshortcuts="N">
          <Plus className="ic" strokeWidth={1.75} aria-hidden />
          <span>
            Tambah<span className="hide-m"> loker</span>
          </span>
          <span className="kbd" aria-hidden="true">
            N
          </span>
        </button>
        <div className="menu-wrap" ref={wrap}>
          <button
            ref={trigger}
            type="button"
            className="icon-btn"
            aria-label="Menu lainnya"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls="lk-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <MoreHorizontal className="ic" strokeWidth={2} aria-hidden />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menu}
                id="lk-menu"
                className="menu"
                role="menu"
                aria-label="Menu lainnya"
                onKeyDown={onMenuKey}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
                transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
              >
                {p.account && (
                  <>
                    <div className="menu-note">
                      Masuk sebagai
                      <strong>{p.account.email ?? p.account.name}</strong>
                    </div>
                    {p.sheetUrl && (
                      <a role="menuitem" tabIndex={-1} className="menu-item" href={p.sheetUrl} target="_blank" rel="noopener noreferrer" onClick={() => close(false)}>
                        <Sheet className="ic" strokeWidth={1.75} aria-hidden />
                        Buka Google Sheet
                      </a>
                    )}
                    <button role="menuitem" tabIndex={-1} type="button" className="menu-item" onClick={() => select(p.onSyncNow)}>
                      <RefreshCw className="ic" strokeWidth={1.75} aria-hidden />
                      Sinkron sekarang
                    </button>
                    <hr />
                  </>
                )}
                <button role="menuitem" tabIndex={-1} type="button" className="menu-item" onClick={() => select(p.onExportCsv)}>
                  <Download className="ic" strokeWidth={1.75} aria-hidden />
                  Export CSV
                </button>
                <button role="menuitem" tabIndex={-1} type="button" className="menu-item" onClick={() => select(p.onBackup)}>
                  <Database className="ic" strokeWidth={1.75} aria-hidden />
                  Backup JSON
                </button>
                <hr />
                <button role="menuitem" tabIndex={-1} type="button" className="menu-item" onClick={() => select(() => file.current?.click())}>
                  <FileUp className="ic" strokeWidth={1.75} aria-hidden />
                  Restore dari backup…
                </button>
                <hr />
                <Link role="menuitem" tabIndex={-1} href="/" className="menu-item show-m" onClick={() => close(false)}>
                  <House className="ic" strokeWidth={1.75} aria-hidden />
                  Ke beranda
                </Link>
                <button role="menuitem" tabIndex={-1} type="button" className="menu-item" onClick={() => select(p.onSettings)}>
                  <Settings className="ic" strokeWidth={1.75} aria-hidden />
                  Pengaturan
                </button>
                <button role="menuitem" tabIndex={-1} type="button" className="menu-item" onClick={() => select(toggle)}>
                  {dark ? <Sun className="ic" strokeWidth={1.75} aria-hidden /> : <Moon className="ic" strokeWidth={1.75} aria-hidden />}
                  {dark ? "Mode terang" : "Mode gelap"}
                </button>
                {p.authEnabled &&
                  (p.account ? (
                    <button role="menuitem" tabIndex={-1} type="button" className="menu-item" onClick={() => select(p.onLogout)}>
                      <LogOut className="ic" strokeWidth={1.75} aria-hidden />
                      Keluar
                    </button>
                  ) : (
                    <button role="menuitem" tabIndex={-1} type="button" className="menu-item" onClick={() => select(p.onLogin)}>
                      <LogIn className="ic" strokeWidth={1.75} aria-hidden />
                      Masuk dengan Google
                    </button>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
          <input
            ref={file}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) p.onRestoreFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </header>
  );
}
