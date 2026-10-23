"use client";

import { fmtRelative } from "@/lib/format";
import type { SyncState } from "@/lib/store";

export function syncLabel(s: SyncState, now: number) {
  const ago = "lastSyncAt" in s && s.lastSyncAt ? fmtRelative(s.lastSyncAt, now).toLowerCase() : null;
  switch (s.kind) {
    case "guest":
      return { tone: "", text: "Data tersimpan di perangkat ini · Backup rutin lewat menu ⋯" };
    case "syncing":
      return { tone: "busy", text: "Menyimpan ke Google Sheet…" };
    case "synced":
      return { tone: "ok", text: `Tersimpan di Google Sheet · ${ago ?? "baru saja"}` };
    case "offline":
      return { tone: "bad", text: "Offline. Perubahan disimpan dulu di perangkat ini" };
    case "error":
      return { tone: "bad", text: ago ? `Belum tersinkron sejak ${ago}` : "Belum tersinkron ke Google Sheet" };
    default:
      return { tone: "busy", text: ago ? `Terakhir tersinkron ${ago}` : "Menyiapkan Google Sheet…" };
  }
}

export function SyncStatus({ state, now, sheetUrl }: { state: SyncState; now: number; sheetUrl: string | null }) {
  const { tone, text } = syncLabel(state, now);
  return (
    <span className="sync">
      {state.kind !== "guest" && <span className={`sync-dot ${tone}`} aria-hidden="true" />}
      <span>{text}</span>
      {sheetUrl && state.kind !== "guest" && (
        <>
          <span aria-hidden="true">·</span>
          <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
            Buka Sheet
          </a>
        </>
      )}
    </span>
  );
}
