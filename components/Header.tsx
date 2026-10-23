"use client";

import { AnimatePresence, motion } from "motion/react";
import { Download, FileJson, MoreHorizontal, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function Header({
  onAdd,
  onExportCsv,
  onExportJson,
  onImport,
}: {
  onAdd: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImport: (file: File) => void;
}) {
  const [menu, setMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 font-mono text-xs text-muted">
          <span className="size-2 rounded-full bg-accent ring-4 ring-accent/25" />
          pengumpul loker pribadi
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Lokerku<span className="text-muted">.</span>
        </h1>
      </motion.div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenu((v) => !v)}
            aria-label="Menu lainnya"
            className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition hover:border-ink hover:text-ink"
          >
            <MoreHorizontal size={18} />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 z-30 mt-2 w-52 origin-top-right overflow-hidden rounded-2xl border border-line bg-surface p-1 shadow-[var(--shadow-lg)]"
              >
                <MenuItem icon={<Download size={15} />} onClick={() => { onExportCsv(); setMenu(false); }}>
                  Export CSV
                </MenuItem>
                <MenuItem icon={<FileJson size={15} />} onClick={() => { onExportJson(); setMenu(false); }}>
                  Backup JSON
                </MenuItem>
                <MenuItem icon={<Upload size={15} />} onClick={() => fileRef.current?.click()}>
                  Restore dari JSON
                </MenuItem>
              </motion.div>
            )}
          </AnimatePresence>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = "";
              setMenu(false);
            }}
          />
        </div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAdd}
          className="flex h-11 items-center gap-2 rounded-xl bg-ink pr-3 pl-4 text-sm font-medium text-bg shadow-[0_6px_0_-2px_var(--accent)]"
        >
          <Plus size={17} /> Tambah loker
          <kbd className="ml-1 rounded-md bg-bg/15 px-1.5 py-0.5 font-mono text-[10px]">N</kbd>
        </motion.button>
      </div>
    </header>
  );
}

function MenuItem({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-ink-2 transition hover:bg-surface-2 hover:text-ink"
    >
      <span className="text-muted">{icon}</span>
      {children}
    </button>
  );
}
