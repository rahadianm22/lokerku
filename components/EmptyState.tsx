"use client";

import { motion } from "motion/react";
import { Link2, Plus } from "lucide-react";

export function EmptyState({ onAdd, filtered }: { onAdd: () => void; filtered?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center rounded-[var(--radius)] border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center"
    >
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-ink"
      >
        <Link2 size={24} />
      </motion.div>
      <h3 className="mt-5 text-lg font-semibold">
        {filtered ? "Tidak ada yang cocok" : "Belum ada loker tersimpan"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {filtered
          ? "Coba ganti filter atau kata kunci pencarian."
          : "Tempel link lowongan pertamamu — perusahaan, posisi, lokasi & jam kirim akan tercatat otomatis."}
      </p>
      {!filtered && (
        <button
          onClick={onAdd}
          className="mt-6 flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-bg transition hover:opacity-90"
        >
          <Plus size={16} /> Tambah loker pertama
        </button>
      )}
    </motion.div>
  );
}
