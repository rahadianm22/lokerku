"use client";

import { ChevronDown } from "lucide-react";
import { STATUSES, STATUS_LABEL, type Status } from "@/lib/types";

/**
 * Dropdown status yang terlihat jelas sebagai kontrol: label "Status", kolom berpinggir, dan panah.
 * Untuk kartu mobile, tempat chip tanpa pinggir sulit dikenali sebagai sesuatu yang bisa diketuk (target 44px).
 */
export function StatusSelect({ status, title, onChange }: { status: Status; title: string; onChange: (s: Status) => void }) {
  return (
    <div className="status-field">
      <span className="status-cap" aria-hidden="true">
        Status
      </span>
      <div className={`status-select s-${status}`}>
        <span className="cdot" aria-hidden="true" />
        <select aria-label={`Ubah status ${title}`} value={status} onChange={(e) => onChange(e.target.value as Status)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <ChevronDown className="ic" strokeWidth={2} aria-hidden />
      </div>
    </div>
  );
}

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
