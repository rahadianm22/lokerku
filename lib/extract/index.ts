import * as cheerio from "cheerio";
import { detectPlatform } from "../platform";
import type { ExtractResult, MissingField } from "../types";
import { fromAts } from "./ats";
import { guessCompany } from "./company";
import { fromJsonLd, jsonLdDescription } from "./jsonld";
import { fromPlatform } from "./platforms";
import { clean, detectLevel, detectMode, splitTitle } from "./util";

type Data = ExtractResult["data"];

const KEY_FIELDS: MissingField[] = ["company", "title", "city", "salary", "postedAt", "deadline"];

/** Halaman login, authwall, atau captcha: jangan coba diakali, langsung minta isi manual. */
export function looksBlocked(html: string, $: cheerio.CheerioAPI) {
  const title = clean($("title").first().text()).toLowerCase();
  if (/(sign in|log in|masuk|login|just a moment|attention required|access denied|captcha|verify you are human)/.test(title)) return true;
  if (/authwall|g-recaptcha|cf-challenge|hcaptcha/i.test(html.slice(0, 200_000)) && !/JobPosting/.test(html)) return true;
  return false;
}

/** Isi kolom yang masih kosong di `into` dari `from`. */
function fill(into: Data, from: Data) {
  for (const [k, v] of Object.entries(from) as [keyof Data, Data[keyof Data]][]) {
    if (v === undefined || v === null || v === "") continue;
    if (into[k] === undefined || into[k] === null || into[k] === "") (into as Record<string, unknown>)[k] = v;
  }
}

export function failed(url: string): ExtractResult {
  return { confidence: "failed", missing: [...KEY_FIELDS], data: { url, platform: detectPlatform(url) ?? "Lainnya" } };
}

export function parseJobHtml(html: string, url: string): ExtractResult {
  const $ = cheerio.load(html);
  if (looksBlocked(html, $)) return failed(url);

  const platform = detectPlatform(url) ?? "Lainnya";
  const data: Data = { url, platform };

  // 1. JSON-LD JobPosting
  const ld = fromJsonLd($);
  if (ld) fill(data, ld);

  // 2. Parser khusus platform
  fill(data, fromPlatform($, platform));
  fill(data, fromAts($, url));

  // 3. Open Graph / meta
  const meta = (k: string) => clean($(`meta[property="${k}"]`).attr("content")) || clean($(`meta[name="${k}"]`).attr("content"));
  const ogTitle = meta("og:title") || clean($("title").first().text());
  const split = splitTitle(ogTitle, meta("og:site_name"));
  fill(data, { title: split.title, company: split.company, city: split.city ? clean(split.city).split(",")[0] : "" });
  if (!data.company) {
    const guess = guessCompany({ url, platform, siteName: meta("og:site_name"), appName: meta("application-name") });
    if (guess) data.company = guess;
  }
  const og = meta("og:image");
  if (!data.logoUrl && /^https:\/\//.test(og)) data.logoUrl = og;

  // 4. Heuristik teks
  const desc = meta("og:description") || meta("description");
  if (!data.mode) data.mode = detectMode(data.title ?? "", data.city ?? "", desc, jsonLdDescription($));
  if (!data.level && data.title) data.level = detectLevel(data.title);
  for (const k of Object.keys(data) as (keyof Data)[]) if (data[k] === undefined) delete data[k];

  return scored(data);
}

export function scored(data: Data): ExtractResult {
  const has = (k: MissingField) => !!data[k];
  const missing = KEY_FIELDS.filter((k) => !has(k));
  if (!has("title") && !has("company")) return { confidence: "failed", missing, data };
  const complete = has("company") && has("title") && has("city") && (has("salary") || has("deadline"));
  return { confidence: complete ? "complete" : "partial", missing, data };
}
