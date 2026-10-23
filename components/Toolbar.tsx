"use client";

import { motion } from "motion/react";
import { Search, X } from "lucide-react";
import type { JobStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/types";

export type SortKey = "newest" | "deadline" | "company" | "priority";
export type StatusFilter = JobStatus | "all";

const FILTERS: StatusFilter[] = ["all", "saved", "applied", "interview", "offer", "rejected", "archived"];

export function Toolbar({
  query,
  setQuery,
  filter,
  setFilter,
  sort,
  setSort,
  counts,
}: {
  query: string;
  setQuery: (v: string) => void;
  filter: StatusFilter;
  setFilter: (v: StatusFilter) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  counts: Record<StatusFilter, number>;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:pb-0">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`relative shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active ? "text-bg" : "text-ink-2 hover:text-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="filter-pill"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {f === "all" ? "Semua" : STATUS_META[f].label}
                <span className={`font-mono text-[10px] ${active ? "opacity-60" : "text-muted"}`}>{counts[f] ?? 0}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 lg:w-72 lg:flex-none">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari perusahaan, posisi, lokasi…"
            className="field !rounded-xl !pl-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="field !w-auto !rounded-xl"
          aria-label="Urutkan"
        >
          <option value="newest">Terbaru</option>
          <option value="deadline">Deadline terdekat</option>
          <option value="priority">Prioritas</option>
          <option value="company">Perusahaan A–Z</option>
        </select>
      </div>
    </div>
  );
}
