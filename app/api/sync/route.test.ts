import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SEED } from "@/lib/seed";
import { HEADER, jobToRow } from "@/lib/sheet-codec";

vi.stubEnv("GOOGLE_CLIENT_ID", "id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
vi.stubEnv("NEXTAUTH_SECRET", "s3cret");

const getToken = vi.fn();
vi.mock("next-auth/jwt", () => ({ getToken: (...a: unknown[]) => getToken(...a) }));
vi.mock("server-only", () => ({}));

const sheetRef = { id: "sheet123456", url: "https://docs.google.com/spreadsheets/d/sheet123456", tab: "Loker" };
const ensureSheet = vi.fn();
const readRows = vi.fn();
const writeRows = vi.fn();
class GoogleError extends Error {
  constructor(public status: number, message = "") {
    super(message);
  }
}
vi.mock("@/lib/google", () => ({
  ensureSheet: (...a: unknown[]) => ensureSheet(...a),
  readRows: (...a: unknown[]) => readRows(...a),
  writeRows: (...a: unknown[]) => writeRows(...a),
  GoogleError,
}));

const { POST } = await import("./route");

const req = (body: unknown, raw = false) =>
  new NextRequest("http://localhost/api/sync", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.9" },
    body: raw ? (body as string) : JSON.stringify(body),
  });

const goodToken = { sub: "user-1", driveGranted: true, accessToken: "tok", expiresAt: Date.now() + 3_600_000 };
let userSeq = 0;

beforeEach(() => {
  vi.clearAllMocks();
  // Rate limit per user: pakai id berbeda di tiap test supaya tidak saling mengganggu.
  goodToken.sub = `user-${++userSeq}`;
  getToken.mockResolvedValue({ ...goodToken });
  ensureSheet.mockResolvedValue(sheetRef);
  readRows.mockResolvedValue([[...HEADER]]);
  writeRows.mockResolvedValue(undefined);
});

describe("POST /api/sync", () => {
  it("tanpa sesi → 401 auth, tidak menyentuh Google", async () => {
    getToken.mockResolvedValue(null);
    const res = await POST(req({ jobs: [] }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "auth" });
    expect(ensureSheet).not.toHaveBeenCalled();
  });

  it("izin Drive tidak diberikan → 403 scope", async () => {
    getToken.mockResolvedValue({ ...goodToken, driveGranted: false });
    const res = await POST(req({ jobs: [] }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "scope" });
  });

  it("body rusak atau melanggar schema → 400", async () => {
    expect((await POST(req("bukan json", true))).status).toBe(400);
    expect((await POST(req({ jobs: [{ id: "x" }] }))).status).toBe(400);
    expect((await POST(req({ jobs: [], spreadsheetId: "../etc" }))).status).toBe(400);
    expect(ensureSheet).not.toHaveBeenCalled();
  });

  it("Sheet kosong + loker lokal → menulis semuanya, terbaru di atas", async () => {
    const res = await POST(req({ jobs: SEED }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.spreadsheetId).toBe("sheet123456");
    expect(json.jobs.map((j: { id: string }) => j.id)).toEqual(["seed-1", "seed-2", "seed-3", "seed-4", "seed-5"]);
    expect(writeRows).toHaveBeenCalledTimes(1);
    const [, , rows] = writeRows.mock.calls[0];
    expect(rows).toHaveLength(5);
  });

  it("Sheet sama dengan lokal → tidak menulis ulang", async () => {
    readRows.mockResolvedValue([[...HEADER], ...SEED.map(jobToRow)]);
    const res = await POST(req({ jobs: SEED }));
    expect(res.status).toBe(200);
    expect(writeRows).not.toHaveBeenCalled();
  });

  it("loker yang hanya ada di Sheet ikut dikembalikan ke klien (perangkat lain)", async () => {
    readRows.mockResolvedValue([[...HEADER], ...SEED.slice(0, 2).map(jobToRow)]);
    const res = await POST(req({ jobs: [] }));
    const json = await res.json();
    expect(json.jobs).toHaveLength(2);
    expect(writeRows).not.toHaveBeenCalled();
  });

  it("baris tanpa ID yang ditambah manual di Sheet diberi ID dan ditulis balik", async () => {
    readRows.mockResolvedValue([[...HEADER], ["", "PT Manual", "Analyst"]]);
    const res = await POST(req({ jobs: [] }));
    const json = await res.json();
    expect(json.jobs).toHaveLength(1);
    expect(json.jobs[0].id).toMatch(/[0-9a-f-]{36}/);
    expect(writeRows).toHaveBeenCalledTimes(1);
  });

  it("hapus lokal (tombstone) menimpa baris Sheet yang lebih lama", async () => {
    readRows.mockResolvedValue([[...HEADER], jobToRow(SEED[0])]);
    const dead = { ...SEED[0], deletedAt: SEED[0].updatedAt + 1000, updatedAt: SEED[0].updatedAt + 1000 };
    const res = await POST(req({ jobs: [dead] }));
    const json = await res.json();
    expect(json.jobs[0].deletedAt).toBe(dead.deletedAt);
    expect(writeRows).toHaveBeenCalledTimes(1);
  });

  it("header Sheet rusak → ditulis ulang", async () => {
    readRows.mockResolvedValue([["Kolom", "Salah"], ...SEED.map(jobToRow)]);
    await POST(req({ jobs: SEED }));
    expect(writeRows).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, 401, "auth"],
    [429, 429, "rate"],
    [500, 502, "google"],
  ])("Google %i → %i %s", async (googleStatus, status, error) => {
    readRows.mockRejectedValue(new GoogleError(googleStatus as number));
    const res = await POST(req({ jobs: [] }));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error });
  });

  it("Google 403 karena scope → 403 scope", async () => {
    ensureSheet.mockRejectedValue(new GoogleError(403, "Request had insufficient authentication scopes"));
    const res = await POST(req({ jobs: [] }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "scope" });
  });

  it("rate limit per pengguna: permintaan ke-41 dalam semenit → 429", async () => {
    for (let i = 0; i < 40; i++) expect((await POST(req({ jobs: [] }))).status).toBe(200);
    const res = await POST(req({ jobs: [] }));
    expect(res.status).toBe(429);
  });
});
