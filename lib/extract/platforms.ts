import type { CheerioAPI } from "cheerio";
import type { ExtractResult, Platform } from "../types";
import { formatSalaryText } from "./salary-text";
import { clean, mapEmploymentType, toYmd } from "./util";

type Data = ExtractResult["data"];

/**
 * Parser per platform untuk kolom yang tidak ada di JSON-LD/meta.
 * Selector bisa berubah kapan saja di sisi situs, jadi semuanya opsional:
 * kalau tidak ketemu, kolomnya dibiarkan kosong.
 */
const text = ($: CheerioAPI, sel: string) => clean($(sel).first().text());

function linkedin($: CheerioAPI): Data {
  const criteria: Record<string, string> = {};
  $(".description__job-criteria-item").each((_, el) => {
    const k = clean($(el).find(".description__job-criteria-subheader").text()).toLowerCase();
    const v = clean($(el).find(".description__job-criteria-text").text());
    if (k) criteria[k] = v;
  });
  return {
    title: text($, ".top-card-layout__title, .topcard__title"),
    company: text($, ".topcard__org-name-link, .topcard__flavor a"),
    city: text($, ".topcard__flavor--bullet").split(",")[0]?.trim() ?? "",
    type: mapEmploymentType(criteria["employment type"] ?? criteria["jenis pekerjaan"]),
  };
}

function jobstreet($: CheerioAPI): Data {
  return {
    title: text($, '[data-automation="job-detail-title"]'),
    company: text($, '[data-automation="advertiser-name"]'),
    city: text($, '[data-automation="job-detail-location"]').split(",")[0]?.trim() ?? "",
    type: mapEmploymentType(text($, '[data-automation="job-detail-work-type"]')),
    salary: formatSalaryText(text($, '[data-automation="job-detail-salary"]')),
  };
}

function glints($: CheerioAPI): Data {
  return {
    title: text($, "h1"),
    salary: formatSalaryText(text($, '[class*="SalaryWrapper"], [class*="salary"]')),
  };
}

function kalibrr($: CheerioAPI): Data {
  return {
    title: text($, "h1"),
    deadline: toYmd($('[itemprop="validThrough"]').attr("content")),
  };
}

const PARSERS: Partial<Record<Platform, ($: CheerioAPI) => Data>> = {
  LinkedIn: linkedin,
  JobStreet: jobstreet,
  Glints: glints,
  Kalibrr: kalibrr,
};

export function fromPlatform($: CheerioAPI, platform: Platform): Data {
  const fn = PARSERS[platform];
  if (!fn) return {};
  try {
    return fn($);
  } catch {
    return {};
  }
}
