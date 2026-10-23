import type { JobType, Level, WorkMode } from "../types";

export const clean = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

/** ISO / tanggal bebas → 'YYYY-MM-DD' (kalender WIB). */
export function toYmd(v: unknown): string | null {
  const s = clean(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t + 7 * 3600_000).toISOString().slice(0, 10);
}

export function detectMode(...texts: string[]): WorkMode | undefined {
  const t = texts.join(" ").toLowerCase();
  if (/\bhybrid\b/.test(t)) return "Hybrid";
  if (/\b(remote|wfh|work from home|telecommute)\b/.test(t)) return "Remote";
  if (/\b(on-?site|wfo|work from office)\b/.test(t)) return "On-site";
  return undefined;
}

export function detectLevel(title: string): Level | undefined {
  const t = title.toLowerCase();
  if (/\b(manager|head of|director)\b/.test(t)) return "Manager";
  if (/\b(lead|principal|staff)\b/.test(t)) return "Lead";
  if (/\b(senior|sr\.?)(\s|$)/.test(t)) return "Senior";
  if (/\b(junior|jr\.?|intern|magang|entry level)(\s|$)/.test(t)) return "Junior";
  return undefined;
}

const TYPE_MAP: Record<string, JobType> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Kontrak",
  CONTRACT: "Kontrak",
  TEMPORARY: "Kontrak",
  INTERN: "Magang",
  INTERNSHIP: "Magang",
  FREELANCE: "Freelance",
};

export function mapEmploymentType(v: unknown): JobType | undefined {
  const list = Array.isArray(v) ? v : v ? [v] : [];
  for (const x of list) {
    const key = clean(String(x)).toUpperCase().replace(/[\s-]+/g, "_");
    if (TYPE_MAP[key]) return TYPE_MAP[key];
    if (/KONTRAK/.test(key)) return "Kontrak";
    if (/PENUH|FULL/.test(key)) return "Full-time";
    if (/PARUH|PART/.test(key)) return "Part-time";
    if (/MAGANG|INTERN/.test(key)) return "Magang";
    if (/LEPAS|FREELANCE/.test(key)) return "Freelance";
  }
  return undefined;
}

/** Hilangkan suffix situs dari judul halaman: "… | LinkedIn", "… - JobStreet". */
export function stripSiteSuffix(s: string, siteName = "") {
  let out = clean(s).replace(/\s*[|–—-]\s*(LinkedIn|Glints|JobStreet|Kalibrr|Indeed|Dealls|KitaLulus|Glassdoor)(\s.*)?$/i, "");
  if (siteName) {
    const esc = siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\s*[|–—-]\\s*${esc}.*$`, "i"), "");
  }
  return out.trim();
}

/** Pecah pola judul umum menjadi posisi, perusahaan, lokasi. */
export function splitTitle(raw: string, siteName = ""): { title: string; company: string; city?: string } {
  const s = stripSiteSuffix(raw, siteName);
  let m = /^(.+?)\s+(?:is\s+)?hiring\s+(?:an?\s+)?(.+?)(?:\s+in\s+(.+))?$/i.exec(s);
  if (m) return { company: m[1], title: m[2], city: m[3] };
  m = /^(?:lowongan(?:\s+kerja)?\s+)?(.+?)\s+di\s+(.+?)(?:,\s*(.+))?$/i.exec(s);
  if (m) return { title: m[1], company: m[2], city: m[3] };
  m = /^(.+?)\s+at\s+(.+)$/i.exec(s);
  if (m) return { title: m[1], company: m[2] };
  m = /^(.+?)\s+[|–—-]\s+(.+)$/.exec(s);
  if (m) return { title: m[1], company: m[2] };
  return { title: s, company: "" };
}
