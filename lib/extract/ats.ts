import type { CheerioAPI } from "cheerio";
import type { ExtractResult } from "../types";
import { clean } from "./util";

type Data = ExtractResult["data"];

/** "Vienna, Vienna, Austria" → "Vienna". Kolom Lokasi berisi kota, seperti parser lainnya. */
function firstPlace(s: string) {
  return clean(s).split(",")[0]?.trim() ?? "";
}

/**
 * Greenhouse (boards.greenhouse.io, job-boards.greenhouse.io, job-boards.eu.greenhouse.io).
 * Halaman lowongannya tidak memasang JSON-LD. Struktur yang diamati dari halaman nyata:
 *   <title>Job Application for {Posisi} at {Perusahaan}</title>
 *   <meta property="og:title" content="{Posisi}">
 *   <meta property="og:description" content="{Lokasi}">
 */
function greenhouse($: CheerioAPI): Data {
  const m = /^Job Application for (.+) at (.+)$/.exec(clean($("title").first().text()));
  const loc = clean($('meta[property="og:description"]').attr("content"));
  // og:description berisi lokasi pendek di Greenhouse; kalimat panjang berarti bukan lokasi.
  const looksLikePlace = loc.length > 0 && loc.length <= 80 && !/[.!?]\s/.test(loc);
  return {
    title: m?.[1],
    company: m?.[2],
    city: looksLikePlace ? firstPlace(loc) : undefined,
  };
}

/** Parser untuk penyedia ATS yang dikenali dari alamatnya. Penyedia lain dibaca dari JSON-LD dan meta. */
export function fromAts($: CheerioAPI, rawUrl: string): Data {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return {};
  }
  try {
    if (/(^|\.)greenhouse\.io$/.test(host)) return greenhouse($);
  } catch {
    /* selector berubah: biarkan kolom kosong */
  }
  return {};
}
