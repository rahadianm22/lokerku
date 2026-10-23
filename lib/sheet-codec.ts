import {
  JOB_TYPES, LEVELS, MODES, PLATFORMS, PRIORITY_LABEL, STATUS_LABEL, STATUSES,
  type Job, type JobType, type Level, type Platform, type Priority, type Status, type WorkMode,
} from "./types";

/**
 * Satu baris per loker, header berbahasa Indonesia supaya Sheet-nya enak dibaca dan diedit manual.
 * Status dan prioritas ditulis sebagai label ("Sudah Apply", "Tinggi"), dibaca balik dari label atau id.
 */
export const SHEET_TITLE = "Loker";
export const HEADER = [
  "ID", "Perusahaan", "Posisi", "Status", "Lokasi", "Mode", "Tipe", "Level", "Platform", "Gaji",
  "Diposting", "Deadline", "Prioritas", "Catatan", "Link", "Logo", "Dibuat", "Diubah", "Dihapus",
] as const;

const COL = Object.fromEntries(HEADER.map((h, i) => [h, i])) as Record<(typeof HEADER)[number], number>;

const tsOut = (n: number | null | undefined) => (n ? new Date(n).toISOString() : "");

export function jobToRow(j: Job): string[] {
  const row = new Array<string>(HEADER.length).fill("");
  row[COL.ID] = j.id;
  row[COL.Perusahaan] = j.company;
  row[COL.Posisi] = j.title;
  row[COL.Status] = STATUS_LABEL[j.status];
  row[COL.Lokasi] = j.city;
  row[COL.Mode] = j.mode;
  row[COL.Tipe] = j.type;
  row[COL.Level] = j.level;
  row[COL.Platform] = j.platform;
  row[COL.Gaji] = j.salary;
  row[COL.Diposting] = j.postedAt ?? "";
  row[COL.Deadline] = j.deadline ?? "";
  row[COL.Prioritas] = PRIORITY_LABEL[j.priority];
  row[COL.Catatan] = j.notes;
  row[COL.Link] = j.url;
  row[COL.Logo] = j.logoUrl ?? "";
  row[COL.Dibuat] = tsOut(j.createdAt);
  row[COL.Diubah] = tsOut(j.updatedAt);
  row[COL.Dihapus] = tsOut(j.deletedAt);
  return row;
}

const norm = (s: string) => s.trim().toLocaleLowerCase("id");

function pick<T extends string>(raw: string, options: readonly T[], fallback: T, labels?: Record<T, string>): T {
  const v = norm(raw);
  if (!v) return fallback;
  for (const o of options) if (norm(o) === v || (labels && norm(labels[o]) === v)) return o;
  return fallback;
}

/** Terima 'YYYY-MM-DD', '25/10/2026' (format Indonesia), atau tanggal yang bisa di-parse. */
export function parseDateCell(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const t = Date.parse(v);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

function parseTs(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^\d{12,}$/.test(v)) return Number(v);
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/**
 * Baris tanpa ID (ditambah manual di Sheet) diberi ID baru dan waktu sekarang.
 * Baris tanpa perusahaan dan posisi dilewati.
 */
export function rowToJob(row: unknown[], now: number, newId: () => string): Job | null {
  const cell = (k: (typeof HEADER)[number]) => String(row[COL[k]] ?? "").trim();
  const company = cell("Perusahaan").slice(0, 200);
  const title = cell("Posisi").slice(0, 300);
  if (!company && !title) return null;
  const id = cell("ID").slice(0, 64) || newId();
  const createdAt = parseTs(cell("Dibuat")) ?? now;
  return {
    id,
    company,
    title,
    status: pick<Status>(cell("Status"), STATUSES, "saved", STATUS_LABEL),
    city: cell("Lokasi").slice(0, 200),
    mode: pick<WorkMode>(cell("Mode"), MODES, "Belum tahu"),
    type: pick<JobType>(cell("Tipe"), JOB_TYPES, "Full-time"),
    level: pick<Level>(cell("Level"), LEVELS, "Mid"),
    platform: pick<Platform>(cell("Platform"), PLATFORMS, "Lainnya"),
    salary: cell("Gaji").slice(0, 120),
    postedAt: parseDateCell(cell("Diposting")),
    deadline: parseDateCell(cell("Deadline")),
    priority: pick<Priority>(cell("Prioritas"), ["low", "med", "high"], "med", PRIORITY_LABEL),
    notes: cell("Catatan").slice(0, 5000),
    url: cell("Link").slice(0, 2048),
    logoUrl: cell("Logo").slice(0, 2048) || undefined,
    createdAt,
    updatedAt: parseTs(cell("Diubah")) ?? now,
    deletedAt: parseTs(cell("Dihapus")),
  };
}

export function rowsToJobs(rows: unknown[][], now: number, newId: () => string): Job[] {
  const [, ...body] = rows; // baris pertama header
  const seen = new Set<string>();
  const out: Job[] = [];
  for (const r of body) {
    const j = rowToJob(r ?? [], now, newId);
    if (!j || seen.has(j.id)) continue;
    seen.add(j.id);
    out.push(j);
  }
  return out;
}
