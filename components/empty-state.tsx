"use client";

import { Link2, Plus } from "lucide-react";
import { motion } from "motion/react";

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty">
      <motion.div
        className="empty-ic"
        aria-hidden="true"
        animate={{ y: [0, -9, 0], rotate: [-5, -1, -5] }}
        transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
      >
        <Link2 className="ic" strokeWidth={1.5} />
        <span className="spark" />
      </motion.div>
      <h2>Belum ada loker tersimpan</h2>
      <p>
        Tempel link lowongan dari LinkedIn, JobStreet, Glints, Kalibrr, Indeed, Dealls, atau situs karier perusahaan. Lokerku yang
        merapikan datanya.
      </p>
      <button type="button" className="btn btn-ink" onClick={onAdd} aria-keyshortcuts="N">
        <Plus className="ic" strokeWidth={1.75} aria-hidden />
        Tambah loker pertama
        <span className="kbd" aria-hidden="true">
          N
        </span>
      </button>
    </div>
  );
}

export function NoResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="noresult">
      <span>Tidak ada loker yang cocok dengan filter ini.</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
        Tampilkan semua loker
      </button>
    </div>
  );
}
