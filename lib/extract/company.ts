import type { Platform } from "../types";
import { clean } from "./util";

/** Nama papan lowongan: kalau `og:site_name` berisi ini, itu bukan nama perusahaan. */
const BOARD_NAMES = /^(linkedin|jobstreet|glints|kalibrr|indeed|dealls|kitalulus|karir\.com|topkarir|glassdoor|tech in asia|wellfound|instagram|x|twitter|facebook)\b/i;

/** Awalan subdomain yang bukan bagian nama perusahaan: careers.bitpanda.com, jobs.contoh.id, www.xxx. */
const NOISE_LABELS = new Set(["www", "careers", "career", "karir", "karier", "jobs", "job", "lowongan", "apply", "hiring", "work", "join", "recruit", "recruitment", "talent", "id", "en"]);

/** Akhiran dua bagian yang umum, supaya "contoh.co.id" dibaca sebagai "contoh". */
const SECOND_LEVEL = new Set(["co", "com", "or", "go", "ac", "web", "net", "org", "sch", "my", "biz"]);

function titleCase(s: string) {
  return s
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (w.length <= 3 && /^[a-z]+$/.test(w) && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Perusahaan dari alamat penyedia ATS: boards.greenhouse.io/bitpanda, jobs.lever.co/bitpanda, bitpanda.jobs.personio.de, dst. */
export function atsCompany(rawUrl: string): string {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return "";
  }
  const host = u.hostname.toLowerCase();
  const first = u.pathname.split("/").filter(Boolean)[0] ?? "";
  const pathBased = /(^|\.)(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|smartrecruiters\.com)$/;
  if (pathBased.test(host)) return first && !/^(jobs|j|o|embed)$/i.test(first) ? titleCase(decodeURIComponent(first)) : "";
  const sub = /^([a-z0-9-]+)\.(jobs\.personio\.(de|com)|teamtailor\.com|recruitee\.com|bamboohr\.com|breezy\.hr|jobs\.workable\.com)$/.exec(host);
  return sub ? titleCase(sub[1]) : "";
}

/** Nama dari domain: careers.bitpanda.com → "Bitpanda", karier.contoh-maju.co.id → "Contoh Maju". */
export function hostCompany(rawUrl: string): string {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
  const parts = host.split(".");
  if (parts.length < 2) return "";
  let tld = 1;
  if (parts.length >= 3 && parts[parts.length - 1].length === 2 && SECOND_LEVEL.has(parts[parts.length - 2])) tld = 2;
  const labels = parts.slice(0, parts.length - tld);
  const meaningful = labels.filter((l) => !NOISE_LABELS.has(l));
  const name = (meaningful[meaningful.length - 1] ?? labels[labels.length - 1] ?? "").trim();
  return name.length >= 2 ? titleCase(name) : "";
}

/**
 * Tebakan nama perusahaan untuk halaman yang tidak memasang data lowongan terstruktur.
 * Hanya untuk situs karier perusahaan: di papan lowongan, nama situs adalah nama papan, bukan perusahaan.
 */
export function guessCompany(opts: { url: string; platform: Platform; siteName: string; appName: string }): string {
  if (opts.platform !== "Situs perusahaan" && opts.platform !== "Lainnya") return "";
  for (const c of [opts.siteName, opts.appName]) {
    const v = clean(c);
    if (v && !BOARD_NAMES.test(v) && v.length <= 80) return v;
  }
  return atsCompany(opts.url) || hostCompany(opts.url);
}
