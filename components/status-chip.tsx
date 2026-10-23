"use client";

import { ChevronDown } from "lucide-react";
import { STATUSES, STATUS_LABEL, type Status } from "@/lib/types";

/** Chip berwarna dengan <select> asli transparan di atasnya: bisa diganti dengan mouse, sentuh, atau keyboard. */
export function StatusChip({ status, title, onChange }: { status: Status; title: string; onChange: (s: Status) => void }) {
  return (
    <label className="chip-wrap">
      <span className={`chip s-${status}`}>
        <span className="cdot" />
        {STATUS_LABEL[status]}
        <ChevronDown className="ic" strokeWidth={1.75} aria-hidden />
      </span>
      <select aria-label={`Ubah status ${title}`} value={status} onChange={(e) => onChange(e.target.value as Status)}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
