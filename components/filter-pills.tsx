"use client";

import { motion } from "motion/react";
import { STATUSES, STATUS_LABEL, type Status } from "@/lib/types";

export type Filter = Status | "all";
const ITEMS: { id: Filter; label: string }[] = [{ id: "all", label: "Semua" }, ...STATUSES.map((s) => ({ id: s, label: STATUS_LABEL[s] }))];

export function FilterPills({ value, counts, onChange }: { value: Filter; counts: Record<Filter, number>; onChange: (f: Filter) => void }) {
  return (
    <div className="pills-scroll">
      <div className="pills" role="group" aria-label="Filter status">
        {ITEMS.map((it) => {
          const on = it.id === value;
          return (
            <button key={it.id} type="button" className="pill" aria-pressed={on} onClick={() => onChange(it.id)}>
              {on && (
                <motion.span
                  layoutId="pill-ind"
                  className="pill-ind"
                  transition={{ duration: 0.3, ease: [0.3, 0.7, 0.2, 1] }}
                  aria-hidden
                />
              )}
              <span className="pill-label">
                {it.label} <span className="count">{counts[it.id] ?? 0}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
