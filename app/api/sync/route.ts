import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { authEnabled, refreshGoogleToken } from "@/lib/auth";
import { ensureSheet, GoogleError, readKnownSheet, readRows, writeRows } from "@/lib/google";
import { differs, mergeJobs } from "@/lib/merge";
import { rateLimit } from "@/lib/rate-limit";
import { syncRequestSchema } from "@/lib/schema";
import { HEADER, jobToRow, rowsToJobs } from "@/lib/sheet-codec";

export const runtime = "nodejs";
// Satu sinkron = beberapa panggilan berurutan ke Drive dan Sheets.
export const maxDuration = 30;

export type SyncError = "auth" | "scope" | "rate" | "invalid" | "google" | "disabled";
const fail = (error: SyncError, status: number) => NextResponse.json({ error }, { status });

type Who = { sub: string; access: string } | { error: "auth" | "scope" };

async function accessToken(req: NextRequest): Promise<Who> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) return { error: "auth" };
  if (!token.driveGranted) return { error: "scope" };
  // getToken tidak menjalankan callback jwt, jadi token kedaluwarsa disegarkan di sini untuk request ini saja.
  const fresh = token.expiresAt && Date.now() < token.expiresAt - 60_000 ? token : await refreshGoogleToken(token);
  if (fresh.error || !fresh.accessToken) return { error: "auth" };
  return { sub: token.sub, access: fresh.accessToken };
}

export async function POST(req: NextRequest) {
  if (!authEnabled) return fail("disabled", 404);
  const who = await accessToken(req);
  if ("error" in who) return fail(who.error, who.error === "auth" ? 401 : 403);
  if (!rateLimit(`sync:${who.sub}`, 40, 60_000)) return fail("rate", 429);

  const parsed = syncRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("invalid", 400);

  try {
    const now = Date.now();
    const { spreadsheetId, verify } = parsed.data;
    // Biasanya 1 permintaan baca. Pemeriksaan lengkap (3 permintaan) hanya saat diminta atau jalur cepat gagal.
    const fast = spreadsheetId && !verify ? await readKnownSheet(who.access, spreadsheetId) : null;
    const sheet = fast ? fast.sheet : await ensureSheet(who.access, spreadsheetId);
    const rows = fast ? fast.rows : await readRows(who.access, sheet);
    const fromSheet = rowsToJobs(rows, now, randomUUID);
    const merged = mergeJobs(fromSheet, parsed.data.jobs, now).sort((a, b) => b.createdAt - a.createdAt);

    // Tulis ulang bila isi berubah, ada baris manual tanpa ID, atau header-nya rusak.
    const headerOk = HEADER.every((h, i) => rows[0]?.[i] === h);
    const missingIds = rows.slice(1).some((r) => r?.length && !String(r[0] ?? "").trim());
    if (!headerOk || missingIds || differs(fromSheet, merged)) {
      await writeRows(who.access, sheet, merged.map(jobToRow), rows.length);
    }

    return NextResponse.json({ spreadsheetId: sheet.id, spreadsheetUrl: sheet.url, jobs: merged, syncedAt: now });
  } catch (e) {
    if (e instanceof GoogleError) {
      if (e.status === 401) return fail("auth", 401);
      if (e.status === 403) return fail(/insufficient|scope/i.test(e.message) ? "scope" : "google", 403);
      if (e.status === 429) return fail("rate", 429);
    }
    console.error("[sync]", e);
    return fail("google", 502);
  }
}
