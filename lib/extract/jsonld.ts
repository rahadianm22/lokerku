import type { CheerioAPI } from "cheerio";
import type { ExtractResult } from "../types";
import { formatSalary } from "./salary";
import { clean, mapEmploymentType, toYmd } from "./util";

/* eslint-disable @typescript-eslint/no-explicit-any */

function findJobPosting(node: any, depth = 0): any | null {
  if (!node || typeof node !== "object" || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findJobPosting(n, depth + 1);
      if (f) return f;
    }
    return null;
  }
  const t = node["@type"];
  if (t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"))) return node;
  return node["@graph"] ? findJobPosting(node["@graph"], depth + 1) : null;
}

function cityOf(jl: any): string {
  const list = Array.isArray(jl) ? jl : jl ? [jl] : [];
  for (const l of list) {
    const a = l?.address ?? l;
    if (typeof a === "string" && clean(a)) return clean(a);
    const city = clean(a?.addressLocality) || clean(a?.addressRegion);
    if (city) return city;
  }
  return "";
}

const logoOf = (org: any) => clean(org?.logo?.url ?? org?.logo?.contentUrl ?? org?.logo);

/**
 * Banyak situs menulis JSON-LD dengan baris baru mentah di dalam string (deskripsi HTML), yang tidak valid menurut JSON.
 * Coba apa adanya dulu, lalu ulangi dengan karakter kontrol diganti spasi.
 */
export function parseLd(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/[\u0000-\u001F]+/g, " "));
  }
}

export function fromJsonLd($: CheerioAPI): ExtractResult["data"] | null {
  let jp: any = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (jp) return;
    try {
      jp = findJobPosting(parseLd($(el).contents().text()));
    } catch {
      /* JSON-LD rusak: lewati */
    }
  });
  if (!jp) return null;

  const org = jp.hiringOrganization;
  const data: ExtractResult["data"] = {
    title: clean(jp.title),
    company: clean(typeof org === "string" ? org : org?.name),
    city: cityOf(jp.jobLocation) || clean(jp.applicantLocationRequirements?.name),
    salary: formatSalary(jp.baseSalary ?? jp.estimatedSalary),
    postedAt: toYmd(jp.datePosted),
    deadline: toYmd(jp.validThrough),
  };
  const logo = logoOf(org);
  if (/^https?:\/\//.test(logo)) data.logoUrl = logo;
  const type = mapEmploymentType(jp.employmentType);
  if (type) data.type = type;
  if (clean(jp.jobLocationType).toUpperCase() === "TELECOMMUTE") data.mode = "Remote";
  return data;
}

/** Deskripsi JSON-LD, untuk heuristik mode kerja. */
export function jsonLdDescription($: CheerioAPI): string {
  let out = "";
  $('script[type="application/ld+json"]').each((_, el) => {
    if (out) return;
    try {
      const jp = findJobPosting(parseLd($(el).contents().text()));
      if (jp?.description) out = clean(String(jp.description).replace(/<[^>]+>/g, " ")).slice(0, 4000);
    } catch {
      /* lewati */
    }
  });
  return out;
}
