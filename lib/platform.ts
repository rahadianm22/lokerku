import type { Platform } from "./types";

/** Papan lowongan lain yang bukan situs perusahaan, tapi tidak punya label sendiri. */
const OTHER_BOARDS = /(^|\.)(indeed|karir|dealls|kitalulus|topkarir|techinasia|glassdoor|wellfound|upwork|instagram|x|twitter|facebook)\.|forms\.gle|docs\.google\.com/;

export function detectPlatform(url: string): Platform | null {
  let host: string;
  try {
    host = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host.includes(".")) return null;
  if (/(^|\.)linkedin\./.test(host)) return "LinkedIn";
  if (/(^|\.)jobstreet\./.test(host)) return "JobStreet";
  if (/(^|\.)glints\./.test(host)) return "Glints";
  if (/(^|\.)kalibrr\./.test(host)) return "Kalibrr";
  if (OTHER_BOARDS.test(host)) return "Lainnya";
  return "Situs perusahaan";
}

/** Label chip di langkah 1: 'LinkedIn terdeteksi' / 'Halaman karier perusahaan'. */
export function detectedLabel(p: Platform) {
  if (p === "Situs perusahaan") return "Halaman karier perusahaan";
  if (p === "Lainnya") return "Link lowongan terdeteksi";
  return `${p} terdeteksi`;
}
