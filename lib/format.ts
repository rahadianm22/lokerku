const TZ = "Asia/Jakarta";

export function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

const rtf = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });

export function fmtRelative(iso: string, now = Date.now()) {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "baru saja";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return rtf.format(Math.round(diff / (86400 * 30)), "month");
}

/** Sisa hari sampai deadline (negatif = lewat). */
export function daysLeft(iso: string | null, now = Date.now()) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - now) / 86400000);
}

/** ISO -> value untuk <input type="date"> */
export function toDateInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function fromDateInput(v: string): string | null {
  if (!v) return null;
  return new Date(`${v}T00:00:00+07:00`).toISOString();
}

export function initials(name: string) {
  const w = name.replace(/^(PT|CV|Tbk)\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "?") + (w[1]?.[0] ?? "")).toUpperCase();
}

/** Warna avatar stabil dari nama perusahaan */
export function hueFrom(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
