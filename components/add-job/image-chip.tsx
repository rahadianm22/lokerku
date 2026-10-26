"use client";

import { ImageIcon, X } from "lucide-react";

export interface Shot {
  url: string;
  name: string;
  width: number;
  height: number;
  status: "reading" | "done" | "error";
  pct: number;
  label: string;
}

/** Gambar yang ditempel, ditampilkan seperti lampiran: miniatur, nama, ukuran, dan tombol hapus. */
export function ImageChip({ shot, onRemove }: { shot: Shot; onRemove: () => void }) {
  return (
    <div className="shot" data-status={shot.status}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shot.url} alt="" className="shot-thumb" />
      <div className="shot-meta">
        <span className="shot-name">
          <ImageIcon className="ic" strokeWidth={1.75} aria-hidden />
          {shot.name}
          {shot.width > 0 && <span className="mono shot-dim">{shot.width}×{shot.height}</span>}
        </span>
        {shot.status === "reading" && (
          <span className="shot-state">
            <span className="spin" aria-hidden="true" />
            {shot.label}
            {shot.pct > 0 ? ` ${shot.pct}%` : "…"}
          </span>
        )}
      </div>
      <button type="button" className="close" onClick={onRemove} aria-label="Hapus gambar">
        <X className="ic" width={16} height={16} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
