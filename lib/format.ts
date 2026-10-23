import { isClosed, type Job, type Priority, type Status } from "./types";

// WIB (Asia/Jakarta) = UTC+7 tanpa DST, jadi offset tetap lebih cepat dan konsisten daripada Intl di setiap sel.
const WIB_OFFSET = 7 * 3600_000;
const DAY = 86_400_000;
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Komponen tanggal kalender WIB dari epoch ms. WIB tidak punya DST, jadi offset tetap aman. */
function wibParts(ts: number) {
  const d = new Date(ts + WIB_OFFSET);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes() };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Hari kalender WIB sebagai angka urut (untuk selisih hari). */
function wibDayNumber(ts: number) {
  const p = wibParts(ts);
  return Date.UTC(p.y, p.m, p.d) / DAY;
}

export function parseYmd(s: string | null | undefined) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo - 1, d, day: Date.UTC(y, mo - 1, d) / DAY };
}

/** '23 Okt, 09:14 WIB' */
export function fmtSent(ts: number) {
  const p = wibParts(ts);
  return `${p.d} ${MONTHS[p.m]}, ${pad(p.h)}:${pad(p.min)} WIB`;
}

/** '23 Okt · 09:14' untuk kartu mobile */
export function fmtSentShort(ts: number) {
  const p = wibParts(ts);
  return `${p.d} ${MONTHS[p.m]} · ${pad(p.h)}:${pad(p.min)}`;
}

/** '25 Okt 2026' */
export function fmtDate(ymd: string | null) {
  const p = parseYmd(ymd);
  return p ? `${p.d} ${MONTHS[p.m]} ${p.y}` : "";
}

/** '25 Okt' */
export function fmtDateShort(ymd: string | null) {
  const p = parseYmd(ymd);
  return p ? `${p.d} ${MONTHS[p.m]}` : "";
}

export function fmtPosted(ymd: string | null) {
  const s = fmtDateShort(ymd);
  return s ? `Diposting ${s}` : "Tgl posting belum ada";
}

export function fmtRelative(ts: number, now = Date.now()) {
  const diff = Math.max(0, now - ts);
  if (diff < 60_000) return "Baru saja";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} menit yang lalu`;
  if (diff < DAY) return `${Math.floor(diff / 3_600_000)} jam yang lalu`;
  const days = wibDayNumber(now) - wibDayNumber(ts);
  if (days <= 1) return "Kemarin";
  if (days < 7) return `${days} hari yang lalu`;
  return `${Math.floor(days / 7)} minggu yang lalu`;
}

/** Selisih hari kalender WIB dari hari ini ke deadline. null bila tidak ada deadline. */
export function deadlineDiff(ymd: string | null, now = Date.now()) {
  const p = parseYmd(ymd);
  return p ? p.day - wibDayNumber(now) : null;
}

export type DeadlineBadge = { label: string; tone: "urgent" | "past" | "far" } | null;

export function deadlineBadge(ymd: string | null, status: Status, now = Date.now()): DeadlineBadge {
  const diff = deadlineDiff(ymd, now);
  if (diff === null) return null;
  if (diff < 0) return { label: "Lewat", tone: "past" };
  if (isClosed(status)) return null;
  if (diff === 0) return { label: "Hari ini", tone: "urgent" };
  if (diff <= 3) return { label: `${diff} hari`, tone: "urgent" };
  return { label: `${diff} hari lagi`, tone: "far" };
}

/** 'YYYY-MM-DD' hari ini di WIB, untuk nama file export. */
export function todayYmd(now = Date.now()) {
  const p = wibParts(now);
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;
}

/** ISO 8601 dengan offset +07:00. */
export function isoWib(ts: number) {
  const p = wibParts(ts);
  const s = new Date(ts + WIB_OFFSET).getUTCSeconds();
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}:${pad(s)}+07:00`;
}

export interface Stats {
  total: number;
  week: number;
  applied: number;
  appliedPct: number;
  interview: number;
  dueSoon: number;
}

export function computeStats(jobs: Job[], now = Date.now()): Stats {
  const total = jobs.length;
  const week = jobs.filter((j) => j.createdAt >= now - 7 * DAY).length;
  const applied = jobs.filter((j) => j.status !== "saved" && j.status !== "archive").length;
  const interview = jobs.filter((j) => j.status === "interview").length;
  const dueSoon = jobs.filter((j) => {
    const d = deadlineDiff(j.deadline, now);
    return d !== null && d >= 0 && d <= 3 && !isClosed(j.status);
  }).length;
  return { total, week, applied, appliedPct: total ? Math.round((applied / total) * 100) : 0, interview, dueSoon };
}

export type SortKey = "new" | "deadline" | "priority" | "az";
const PRIO_RANK: Record<Priority, number> = { high: 3, med: 2, low: 1 };

export function sortJobs(jobs: Job[], key: SortKey, now = Date.now()) {
  const list = [...jobs];
  const newest = (a: Job, b: Job) => b.createdAt - a.createdAt;
  switch (key) {
    case "deadline": {
      const k = (j: Job) => {
        const d = deadlineDiff(j.deadline, now);
        return d === null || d < 0 ? Infinity : d;
      };
      return list.sort((a, b) => k(a) - k(b) || newest(a, b));
    }
    case "priority":
      return list.sort((a, b) => PRIO_RANK[b.priority] - PRIO_RANK[a.priority] || newest(a, b));
    case "az":
      return list.sort((a, b) => a.company.localeCompare(b.company, "id"));
    default:
      return list.sort(newest);
  }
}

export function matchesQuery(j: Job, q: string) {
  const s = q.trim().toLocaleLowerCase("id");
  if (!s) return true;
  return [j.company, j.title, j.city, j.platform].join(" ").toLocaleLowerCase("id").includes(s);
}

/* Avatar: 6 pasangan tint dari hash nama perusahaan (dari canvas desain). */
const TINT_LIGHT: [string, string][] = [
  ["#E9F2D2", "#3E5410"], ["#E4ECFB", "#22509F"], ["#FBEFD5", "#7F5300"],
  ["#F4E4F1", "#76306B"], ["#DFF1EE", "#17625A"], ["#ECEBE4", "#4F4D45"],
];
const TINT_DARK: [string, string][] = [
  ["rgba(198,242,78,.14)", "#D4F57A"], ["rgba(120,160,255,.16)", "#A9C3FF"], ["rgba(242,181,68,.15)", "#F5C978"],
  ["rgba(230,140,215,.15)", "#EDB2E2"], ["rgba(90,210,190,.15)", "#8FE3D4"], ["rgba(255,255,255,.08)", "#CFCDC3"],
];

export function tintIndex(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % TINT_LIGHT.length;
}

export function avatarTint(name: string, dark: boolean) {
  return (dark ? TINT_DARK : TINT_LIGHT)[tintIndex(name || "?")];
}

export function initial(name: string) {
  const ch = name.trim().replace(/^(PT|CV)\.?\s+/i, "").charAt(0);
  return ch ? ch.toLocaleUpperCase("id") : "?";
}
