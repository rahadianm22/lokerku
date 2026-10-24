import type { JobType, Level, WorkMode } from "../types";
import { formatSalaryText } from "./salary-text";
import { clean, detectLevel, detectMode, mapEmploymentType } from "./util";

export interface PostFields {
  title?: string;
  company?: string;
  city?: string;
  salary?: string;
  deadline?: string;
  mode?: WorkMode;
  level?: Level;
  type?: JobType;
  /** Teks asli, supaya sumbernya tetap tersimpan di Catatan. */
  notes?: string;
}

const MONTHS: Record<string, number> = {
  jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4,
  mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, agu: 8, agt: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, november: 11,
  des: 12, desember: 12, dec: 12, december: 12,
};

const CAP = String.raw`[A-Z][\p{L}\d&.'’-]*(?:\s+[A-Z][\p{L}\d&.'’-]*){0,3}`;

/** "UI/UX DESIGNER" tetap UI/UX Designer; "SENIOR PRODUCT DESIGNER" jadi Senior Product Designer. */
function untitleShout(s: string) {
  if (s !== s.toUpperCase() || s.length <= 4) return s;
  return s
    .split(/\s+/)
    .map((w) => (w.length <= 3 || w.includes("/") ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}

function tidyTitle(raw: string) {
  const s = clean(raw.replace(/^[^\p{L}\d]+/u, "").split(/\s[|•·(]/)[0].replace(/[\s!.,:;…\p{Extended_Pictographic}]+$/u, ""));
  return s.length >= 2 && s.length <= 80 ? untitleShout(s) : "";
}

function findTitle(text: string) {
  const keyed = new RegExp(
    String.raw`(?:positions?\s+available|open\s+positions?|posisi(?:\s+yang\s+dibuka)?|dibutuhkan|dicari|(?:we(?:'|’)?re|we\s+are)\s+hiring|now\s+hiring|hiring|lowongan(?:\s+kerja)?|open\s+recruitment|vacancy|job\s+title)\s*[:\-–]\s*([^\n]{2,80})`,
    "i",
  ).exec(text);
  if (keyed) {
    const t = tidyTitle(keyed[1]);
    if (t) return t;
  }
  // Baris yang diawali kata lowongan, tanpa titik dua: "Hiring ✨ UI/UX Designer (Remote)"
  const headline = /^[ \t]*(?:we(?:'|’)?re[ \t]+)?(?:now[ \t]+)?(?:hiring|lowongan(?:[ \t]+kerja)?|dicari|dibutuhkan)\b[^\p{L}\d\n]*([^\n(|]{3,70})/imu.exec(text);
  if (headline) {
    const t = tidyTitle(headline[1]);
    if (t) return t;
  }
  // Kalimat pembuka lowongan berbahasa Inggris: "Calm.com is hiring a remote Senior Product Designer to join their team"
  const hiring = /(?:is|are)\s+hiring\s+(?:an?\s+)?(?:remote\s+)?(.{3,70}?)\s+(?:to\s+[a-z]+|for\s+(?:our|the|their)|in\s+(?:our|the|their))\b/i.exec(text);
  if (hiring) {
    const t = tidyTitle(hiring[1]);
    if (t) return t;
  }
  // Baris pertama yang berteriak: "UI/UX DESIGNER, WE NEED YOU!" / "Frontend Engineer dibutuhkan"
  const first = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const shout = /^(.{3,60}?)[,!:]?\s*(?:we\s+need\s+you|we(?:'|’)?re\s+hiring|needed|wanted|dibutuhkan|dicari|dibuka)\b/i.exec(first);
  return shout ? tidyTitle(shout[1]) : "";
}

const PRONOUN = /^(they|we|you|i|it|he|she|who|which|this|that|there|kami|kita|saya|anda|mereka|kamu)$/i;

function findCompany(text: string) {
  const legal = new RegExp(String.raw`\b((?:PT|CV)\.?\s+${CAP})`, "u").exec(text);
  if (legal) return clean(legal[1]);
  const verb = new RegExp(
    String.raw`(${CAP})\s+(?:lagi\s+(?:cari|butuh|membuka|buka)|sedang\s+(?:mencari|membuka|butuh)|is\s+(?:hiring|looking)|are\s+(?:hiring|looking)|membuka\s+lowongan|membuka\s+kesempatan)`,
    "u",
  ).exec(text);
  // Titik di akhir kalimat sebelumnya bisa ikut tertangkap ("…open-source AI. They are hiring"): ambil kalimat terakhir saja.
  const name = verb ? (clean(verb[1]).split(/[.!?]\s+/).pop() ?? "") : "";
  // "They are hiring…" / "Kami sedang mencari…": kata ganti bukan nama perusahaan.
  return PRONOUN.test(name) ? "" : name;
}

function findDeadline(text: string, now: number) {
  const m =
    /(?:deadline|batas(?:\s+akhir)?(?:\s+pendaftaran)?|paling\s+lambat|hingga|sampai|until|closing\s+date|apply\s+by|before)\s*:?\s*(?:tanggal\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?\s*(\d{4})?/i.exec(text);
  const mf = m
    ? null
    : /(?:apply\s+before|deadline|closing\s+date|apply\s+by|valid\s+through|until)\s*:?\s*([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i.exec(text);
  const hit = m ? { d: m[1], mo: m[2], y: m[3] } : mf ? { d: mf[2], mo: mf[1], y: mf[3] } : null;
  if (!hit) return undefined;
  const month = MONTHS[hit.mo.toLowerCase()];
  const day = Number(hit.d);
  if (!month || day < 1 || day > 31) return undefined;
  const today = new Date(now + 7 * 3600_000);
  let year = hit.y ? Number(hit.y) : today.getUTCFullYear();
  const candidate = Date.UTC(year, month - 1, day);
  // Tanpa tahun dan sudah lewat lebih dari sebulan: maksudnya tahun depan.
  if (!hit.y && candidate < Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - 30 * 86_400_000) year += 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Isi kolom dari teks lowongan yang ditempel (caption Instagram, pesan WhatsApp, dll.).
 * Hanya kolom yang polanya jelas yang diisi; selebihnya dibiarkan kosong supaya tidak menebak.
 */
export function parsePostText(raw: string, now = Date.now()): PostFields {
  const text = raw.replace(/\r/g, "").trim().slice(0, 5000);
  if (!text) return {};
  const out: PostFields = {};

  const title = findTitle(text);
  if (title) out.title = title;
  const company = findCompany(text);
  if (company) out.company = company;

  const city = /(?:lokasi|location|penempatan|work\s+location|based\s+in)\s*[:\-–]\s*([^\n,|]{2,40})/i.exec(text);
  if (city) out.city = clean(city[1]);

  const salary = /(?:Rp\.?|IDR)\s?\d[\d.,]*(?:\s?(?:jt|juta|rb|ribu|k))?(?:\s*[-–]\s*(?:Rp\.?|IDR)?\s?\d[\d.,]*(?:\s?(?:jt|juta|rb|ribu|k))?)?/i.exec(text);
  if (salary) out.salary = formatSalaryText(salary[0]);

  const deadline = findDeadline(text, now);
  if (deadline) out.deadline = deadline;

  const mode = detectMode(text);
  if (mode) out.mode = mode;
  const level = title ? detectLevel(title) : undefined;
  if (level) out.level = level;

  const jt = /(?:job\s+type|employment\s+type|tipe\s+pekerjaan|jenis\s+pekerjaan)\s*:?\s*([A-Za-z][A-Za-z -]{2,20})/i.exec(text);
  const type = jt ? mapEmploymentType(jt[1].trim()) : undefined;
  if (type) out.type = type;

  const email = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(text);
  out.notes = (email ? `Kirim lamaran ke ${email[0]}\n\n` : "") + text;
  return out;
}
