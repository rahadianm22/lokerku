import type { Platform } from "./types";

/**
 * Satu sumber untuk deteksi platform dan daftar situs yang ditampilkan di langkah 1.
 * `host` dicocokkan dengan nama host (tanpa path), jadi "karir.com" tidak ikut mengenali "karier.perusahaan.com".
 */
const SITES: { platform: Platform; host: RegExp; label: string }[] = [
  { platform: "LinkedIn", host: /(^|\.)linkedin\./, label: "linkedin.com" },
  { platform: "JobStreet", host: /(^|\.)jobstreet\./, label: "jobstreet.co.id" },
  { platform: "Glints", host: /(^|\.)glints\./, label: "glints.com" },
  { platform: "Kalibrr", host: /(^|\.)kalibrr\./, label: "kalibrr.com" },
  { platform: "Indeed", host: /(^|\.)indeed\./, label: "indeed.com" },
  { platform: "Dealls", host: /(^|\.)dealls\./, label: "dealls.com" },
  { platform: "KitaLulus", host: /(^|\.)kitalulus\./, label: "kitalulus.com" },
  { platform: "Karir.com", host: /(^|\.)karir\.com$/, label: "karir.com" },
  { platform: "TopKarir", host: /(^|\.)topkarir\./, label: "topkarir.com" },
  { platform: "Glassdoor", host: /(^|\.)glassdoor\./, label: "glassdoor.com" },
  { platform: "Tech in Asia", host: /(^|\.)techinasia\./, label: "techinasia.com" },
  { platform: "Wellfound", host: /(^|\.)(wellfound\.com|angel\.co)$/, label: "wellfound.com" },
  { platform: "Instagram", host: /(^|\.)instagram\.com$/, label: "instagram.com" },
  { platform: "X", host: /(^|\.)(x|twitter)\.com$/, label: "x.com" },
];

/** Tempat loker sering diposting tapi tidak punya label sendiri. */
const OTHER = /(^|\.)(facebook\.com|t\.me|telegram\.me|forms\.gle)$|^docs\.google\.com$/;

/** Domain yang ditampilkan sebagai contoh di langkah 1. */
export const SUPPORTED_DOMAINS = SITES.filter((s) => !["Instagram", "X"].includes(s.platform)).map((s) => s.label);

export function detectPlatform(url: string): Platform | null {
  let host: string;
  try {
    host = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host.includes(".")) return null;
  for (const s of SITES) if (s.host.test(host)) return s.platform;
  if (OTHER.test(host)) return "Lainnya";
  return "Situs perusahaan";
}

/** Label chip di langkah 1: 'LinkedIn terdeteksi' / 'Halaman karier perusahaan'. */
export function detectedLabel(p: Platform) {
  if (p === "Situs perusahaan") return "Halaman karier perusahaan";
  if (p === "Lainnya") return "Link lowongan terdeteksi";
  return `${p} terdeteksi`;
}
