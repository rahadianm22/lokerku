import { STATUSES, STATUS_LABEL, type Job, type Status, type StatusEvent } from "./types";

const MAX_EVENTS = 50;
const WIB = 7 * 3_600_000;
const pad = (n: number) => String(n).padStart(2, "0");

/** Riwayat saat loker dibuat. */
export function initialHistory(status: Status, at: number): StatusEvent[] {
  return [{ status, at }];
}

/** Tambahkan perpindahan status. Loker lama tanpa riwayat dianggap berstatus awal sejak dibuat. */
export function withStatusChange(cur: Job, next: Status, at: number): StatusEvent[] {
  const base = cur.history?.length ? cur.history : initialHistory(cur.status, cur.createdAt);
  if (base[base.length - 1]?.status === next) return base;
  return [...base, { status: next, at }].slice(-MAX_EVENTS);
}

/**
 * Riwayat untuk ditampilkan. Kalau status diubah langsung di Google Sheet (riwayat tidak ikut berubah),
 * status sekarang tetap muncul di akhir dengan waktu perubahan terakhir loker itu.
 */
export function timeline(job: Job): StatusEvent[] {
  const h = job.history?.length ? job.history : initialHistory(job.status, job.createdAt);
  return h[h.length - 1].status === job.status ? h : [...h, { status: job.status, at: job.updatedAt }];
}

const APPLIED: Status[] = ["applied", "interview", "offer", "rejected"];

/** Kapan pertama kali melamar: perpindahan pertama ke Sudah Apply atau tahap sesudahnya. */
export function appliedAt(job: Job): number | undefined {
  return timeline(job).find((e) => APPLIED.includes(e.status))?.at;
}

/* ---------- kolom "Riwayat" di Google Sheet: "2026-10-03 10:12 Sudah Apply; 2026-10-10 09:00 Interview" ---------- */

function stamp(ts: number) {
  const d = new Date(ts + WIB);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function historyToCell(h: StatusEvent[] | undefined): string {
  return (h ?? []).map((e) => `${stamp(e.at)} ${STATUS_LABEL[e.status]}`).join("; ");
}

/** Baca balik kolom Riwayat. Entri yang tidak dikenali dilewati, bukan menggagalkan seluruh baris. */
export function cellToHistory(raw: string): StatusEvent[] | undefined {
  const out: StatusEvent[] = [];
  for (const part of raw.split(";")) {
    const m = /^\s*(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}))?\s+(.+?)\s*$/.exec(part);
    if (!m) continue;
    const label = m[4].toLocaleLowerCase("id");
    const status = STATUSES.find((s) => STATUS_LABEL[s].toLocaleLowerCase("id") === label || s === label);
    const at = Date.parse(`${m[1]}T${m[2] ?? "00"}:${m[3] ?? "00"}:00+07:00`);
    if (status && !Number.isNaN(at)) out.push({ status, at });
  }
  return out.length ? out.slice(-MAX_EVENTS) : undefined;
}
