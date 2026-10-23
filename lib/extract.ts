import * as cheerio from "cheerio";
import type { Confidence, ExtractedJob, ExtractResponse, WorkMode } from "./types";
import { detectPlatform } from "./platform";

export { detectPlatform };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const clean = (s: unknown) =>
  typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "";

function stripHtml(html: string) {
  return clean(cheerio.load(`<div>${html}</div>`)("div").text());
}

function truncate(s: string, n = 280) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function toIso(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function detectWorkMode(...texts: string[]): WorkMode {
  const t = texts.join(" ").toLowerCase();
  if (/\bhybrid\b/.test(t)) return "hybrid";
  if (/\b(remote|wfh|work from home|telecommute|anywhere)\b/.test(t)) return "remote";
  if (/\b(on-?site|wfo|work from office|in-?office)\b/.test(t)) return "onsite";
  return "unknown";
}

export function detectSeniority(title: string): string {
  const t = title.toLowerCase();
  if (/\b(intern|magang)\b/.test(t)) return "Intern";
  if (/\b(junior|jr\.?|entry|fresh ?grad)\b/.test(t)) return "Junior";
  if (/\b(principal|staff)\b/.test(t)) return "Principal";
  if (/\b(lead|head|manager|director|vp)\b/.test(t)) return "Lead";
  if (/\b(senior|sr\.?)\b/.test(t)) return "Senior";
  if (/\b(mid|middle|intermediate)\b/.test(t)) return "Mid";
  return "";
}

const EMPLOYMENT: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACTOR: "Kontrak",
  TEMPORARY: "Sementara",
  INTERN: "Magang",
  VOLUNTEER: "Volunteer",
  PER_DIEM: "Harian",
  OTHER: "Lainnya",
};

function formatEmployment(v: unknown): string {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return arr
    .map((x) => EMPLOYMENT[String(x).toUpperCase()] ?? clean(String(x)))
    .filter(Boolean)
    .join(", ");
}

function compactNumber(n: number, currency: string) {
  if (currency === "IDR") {
    if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)} jt`;
    if (n >= 1_000) return `${+(n / 1_000).toFixed(0)} rb`;
  }
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const UNIT: Record<string, string> = {
  HOUR: "jam",
  DAY: "hari",
  WEEK: "minggu",
  MONTH: "bln",
  YEAR: "thn",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatSalary(bs: any): string {
  if (!bs) return "";
  const currency = clean(bs.currency) || "IDR";
  const v = bs.value ?? {};
  const unit = UNIT[clean(v.unitText ?? bs.unitText).toUpperCase()] ?? "";
  const min = Number(v.minValue ?? (typeof v === "number" ? v : v.value));
  const max = Number(v.maxValue);
  if (!min && !max) return "";
  let range: string;
  if (min && max && min !== max) {
    const a = compactNumber(min, currency);
    const b = compactNumber(max, currency);
    const unitA = a.split(" ")[1];
    range = unitA && b.endsWith(` ${unitA}`) ? `${a.split(" ")[0]}–${b}` : `${a}–${b}`;
  } else range = compactNumber(min || max, currency);
  return `${currency} ${range}${unit ? ` / ${unit}` : ""}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatLocation(jl: any): string {
  const list = Array.isArray(jl) ? jl : jl ? [jl] : [];
  const parts = list
    .map((l) => {
      const a = l?.address ?? l;
      if (typeof a === "string") return clean(a);
      return [a?.addressLocality, a?.addressRegion, a?.addressCountry?.name ?? a?.addressCountry]
        .map(clean)
        .filter(Boolean)
        .filter((x, i, arr) => arr.indexOf(x) === i)
        .join(", ");
    })
    .filter(Boolean);
  return [...new Set(parts)].slice(0, 2).join(" · ");
}

/* ------------------------------------------------------------------ */
/*  JSON-LD JobPosting                                                  */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findJobPosting(node: any): any | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findJobPosting(n);
      if (f) return f;
    }
    return null;
  }
  const type = node["@type"];
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting")))
    return node;
  if (node["@graph"]) return findJobPosting(node["@graph"]);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Title heuristics for meta fallback                                 */
/* ------------------------------------------------------------------ */

export function splitTitle(
  raw: string,
  siteName = ""
): { title: string; company: string; location?: string } {
  let s = clean(raw)
    .replace(/\s*[|–—-]\s*(LinkedIn|Glints|JobStreet|Kalibrr|Indeed|Dealls|KitaLulus|Karir\.com|Glassdoor)\b.*$/i, "")
    .trim();
  if (siteName) s = s.replace(new RegExp(`\\s*[|–—-]\\s*${siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*$`, "i"), "").trim();

  // "Company hiring Title in Location" (LinkedIn)
  let m = s.match(/^(.+?)\s+(?:is\s+)?hiring\s+(?:a\s+|an\s+)?(.+?)(?:\s+in\s+(.+))?$/i);
  if (m) return { company: m[1], title: m[2], location: m[3] };
  // "Lowongan Kerja Title di Company, Kota"
  m = s.match(/^(?:lowongan(?:\s+kerja)?\s+)?(.+?)\s+di\s+(.+?)(?:,\s*(.*))?$/i);
  if (m) return { title: m[1], company: m[2], location: m[3] };
  // "Title at Company"
  m = s.match(/^(.+?)\s+at\s+(.+)$/i);
  if (m) return { title: m[1], company: m[2] };
  // "Title - Company" / "Title | Company"
  m = s.match(/^(.+?)\s+[|–—-]\s+(.+)$/);
  if (m) return { title: m[1], company: m[2] };
  return { title: s, company: "" };
}

/* ------------------------------------------------------------------ */
/*  Main parser (pure — testable without network)                      */
/* ------------------------------------------------------------------ */

export function emptyJob(url: string): ExtractedJob {
  return {
    url,
    platform: detectPlatform(url),
    company: "",
    title: "",
    location: "",
    workMode: "unknown",
    employmentType: "",
    salary: "",
    seniority: "",
    postedAt: null,
    deadline: null,
    description: "",
    logo: null,
  };
}

export function parseJobHtml(html: string, url: string): ExtractResponse {
  const $ = cheerio.load(html);
  const data = emptyJob(url);
  const warnings: string[] = [];

  // 1) JSON-LD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jp: any = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (jp) return;
    try {
      jp = findJobPosting(JSON.parse($(el).contents().text()));
    } catch {
      /* JSON rusak, skip */
    }
  });

  const meta = (k: string) =>
    clean($(`meta[property="${k}"]`).attr("content")) ||
    clean($(`meta[name="${k}"]`).attr("content"));

  if (jp) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = jp as any;
    const desc = stripHtml(String(j.description ?? ""));
    data.title = clean(j.title);
    data.company = clean(j.hiringOrganization?.name ?? j.hiringOrganization);
    data.logo = clean(j.hiringOrganization?.logo?.url ?? j.hiringOrganization?.logo) || meta("og:image") || null;
    data.location = formatLocation(j.jobLocation) || clean(j.applicantLocationRequirements?.name);
    data.employmentType = formatEmployment(j.employmentType);
    data.salary = formatSalary(j.baseSalary ?? j.estimatedSalary);
    data.postedAt = toIso(j.datePosted);
    data.deadline = toIso(j.validThrough);
    data.description = truncate(desc);
    data.workMode =
      String(j.jobLocationType ?? "").toUpperCase() === "TELECOMMUTE"
        ? "remote"
        : detectWorkMode(data.title, data.location, desc.slice(0, 1500));
    data.seniority = detectSeniority(data.title);
  }

  // 2) Meta / OpenGraph fallback (dan pengisi field kosong)
  const ogTitle = meta("og:title") || clean($("title").first().text());
  const ogDesc = meta("og:description") || meta("description");
  const siteName = meta("og:site_name");

  const split = splitTitle(ogTitle, siteName);
  data.title ||= split.title;
  data.company ||= split.company;
  data.location ||= clean(split.location);
  data.description ||= truncate(ogDesc);
  data.logo ||= meta("og:image") || null;
  if (!data.location) {
    const loc = ogDesc.match(/\b(?:in|di)\s+([A-Z][\w .]+(?:,\s*[A-Z][\w .]+)?)/);
    if (loc) data.location = clean(loc[1]).slice(0, 60);
  }
  if (data.workMode === "unknown") data.workMode = detectWorkMode(ogTitle, ogDesc);
  data.seniority ||= detectSeniority(data.title);

  // 3) Confidence
  let confidence: Confidence = "none";
  if (data.title && data.company) confidence = jp ? "high" : "partial";
  else if (data.title || data.company) confidence = "partial";

  if (!jp) warnings.push("Data terstruktur tidak ditemukan — hasil diambil dari meta tag, cek lagi ya.");
  if (!data.company) warnings.push("Nama perusahaan belum terdeteksi.");
  if (!data.title) warnings.push("Judul posisi belum terdeteksi.");

  return {
    ok: confidence !== "none",
    data,
    confidence,
    source: jp ? "json-ld" : ogTitle ? "meta" : "url-only",
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/*  Fetch + parse                                                       */
/* ------------------------------------------------------------------ */

export async function extractFromUrl(url: string): Promise<ExtractResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        "accept-language": "id-ID,id;q=0.9,en;q=0.8",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = (await res.text()).slice(0, 2_000_000);
    return parseJobHtml(html, res.url || url);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "gagal fetch";
    return {
      ok: false,
      data: emptyJob(url),
      confidence: "none",
      source: "url-only",
      warnings: [
        `Halaman tidak bisa dibaca (${reason}). Beberapa situs butuh login — isi manual saja.`,
      ],
    };
  } finally {
    clearTimeout(timer);
  }
}
