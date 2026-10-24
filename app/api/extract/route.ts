import { NextResponse } from "next/server";
import { z } from "zod";
import { failed, isLoginOnly, parseJobHtml } from "@/lib/extract";
import { fetchHtml, FetchBlocked } from "@/lib/extract/fetch";
import type { ExtractResult } from "@/lib/types";
import { toHttpUrl } from "@/lib/url";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
// Fetch halaman punya batas 10 detik; beri ruang untuk parsing supaya tidak terpotong di Vercel.
export const maxDuration = 20;

const bodySchema = z.object({ url: z.string().min(4).max(2048) });

const CACHE_TTL = 10 * 60_000;
const cache = new Map<string, { at: number; result: ExtractResult }>();

function cached(url: string) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.result;
  cache.delete(url);
  return null;
}

function remember(url: string, result: ExtractResult) {
  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  cache.set(url, { at: Date.now(), result });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`extract:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  const url = parsed.success ? toHttpUrl(parsed.data.url) : "";
  if (!url) return NextResponse.json({ error: "Link tidak valid. Pakai alamat http(s)." }, { status: 400 });

  const hit = cached(url);
  if (hit) return NextResponse.json(hit);

  // Instagram dan X menyembunyikan isi postingan di balik login. Tidak ada gunanya (dan tidak sopan) membuka halamannya.
  if (isLoginOnly(url)) {
    const result = failed(url, "login-required");
    remember(url, result);
    return NextResponse.json(result);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  let result: ExtractResult;
  try {
    const { html, finalUrl, status } = await fetchHtml(url, ctrl.signal);
    result = status >= 400 || !html ? failed(url) : parseJobHtml(html, finalUrl);
    // Simpan link asli yang ditempel pengguna, bukan URL hasil redirect.
    result.data.url = url;
  } catch (e) {
    if (e instanceof FetchBlocked) {
      return NextResponse.json({ error: "Link ini tidak bisa dibuka dari server Lokerku." }, { status: 400 });
    }
    result = failed(url);
  } finally {
    clearTimeout(timer);
  }
  remember(url, result);
  return NextResponse.json(result);
}
