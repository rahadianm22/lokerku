import { NextResponse } from "next/server";
import { extractFromUrl } from "@/lib/extract";

export const runtime = "nodejs";

/** Tolak alamat lokal/privat supaya endpoint ini tidak jadi proxy ke jaringan internal. */
function isSafeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname;
    if (
      h === "localhost" ||
      h.endsWith(".local") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      h === "[::1]"
    )
      return null;
    return u;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const safe = isSafeUrl(url);
  if (!safe) {
    return NextResponse.json({ error: "Link tidak valid. Pakai http(s)://…" }, { status: 400 });
  }
  const result = await extractFromUrl(safe.toString());
  return NextResponse.json(result);
}
