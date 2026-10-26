import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { ensureSheet, readRows, writeRows, GoogleError } = await import("./google");
const { HEADER } = await import("./sheet-codec");

type Call = { url: string; method: string; body: unknown };
let calls: Call[];
let responses: Array<{ status?: number; json?: unknown }>;

beforeEach(() => {
  calls = [];
  responses = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      calls.push({ url: String(input), method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
      const r = responses.shift() ?? { json: {} };
      const status = r.status ?? 200;
      return new Response(status === 204 ? null : JSON.stringify(r.json ?? {}), { status });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const decoded = (c: Call) => decodeURIComponent(c.url);

describe("ensureSheet", () => {
  it("memakai spreadsheet hasil pencarian appProperties, bukan membuat baru", async () => {
    responses = [
      { json: { files: [{ id: "abc12345678", webViewLink: "https://docs.google.com/spreadsheets/d/abc12345678" }] } },
      { json: { sheets: [{ properties: { sheetId: 0, title: "Loker" } }] } },
    ];
    const s = await ensureSheet("tok");
    expect(s).toEqual({ id: "abc12345678", url: "https://docs.google.com/spreadsheets/d/abc12345678", tab: "Loker" });
    expect(decoded(calls[0])).toContain("appProperties has { key='lokerku' and value='jobs' }");
    expect(decoded(calls[0])).toContain("trashed=false");
    expect(calls.every((c) => c.method === "GET")).toBe(true);
  });

  it("membuat spreadsheet baru bila belum ada: nama, appProperties, header, baris beku", async () => {
    responses = [
      { json: { files: [] } }, // pencarian kosong
      { json: { id: "new1234567", webViewLink: "https://docs.google.com/spreadsheets/d/new1234567" } }, // create
      { json: { sheets: [{ properties: { sheetId: 7, title: "Sheet1" } }] } }, // firstTab
      { json: {} }, // batchUpdate
      { json: {} }, // header
    ];
    const s = await ensureSheet("tok");
    expect(s.tab).toBe("Loker");
    const create = calls[1];
    expect(create.method).toBe("POST");
    expect(create.body).toMatchObject({
      name: "Lokerku",
      mimeType: "application/vnd.google-apps.spreadsheet",
      appProperties: { lokerku: "jobs" },
    });
    const batch = calls[3].body as { requests: { updateSheetProperties?: { properties: { sheetId: number; title: string } } }[] };
    expect(batch.requests[0].updateSheetProperties?.properties).toMatchObject({ sheetId: 7, title: "Loker" });
    const header = calls[4];
    expect(header.method).toBe("PUT");
    expect((header.body as { values: string[][] }).values[0]).toEqual([...HEADER]);
  });

  it("hint id yang sudah dihapus (404) jatuh ke pencarian", async () => {
    responses = [
      { status: 404, json: {} },
      { json: { files: [{ id: "fallback123", webViewLink: "https://x/y" }] } },
      { json: { sheets: [{ properties: { sheetId: 0, title: "Loker" } }] } },
    ];
    expect((await ensureSheet("tok", "gone123456")).id).toBe("fallback123");
  });

  it("hint id yang ada di tempat sampah diabaikan", async () => {
    responses = [
      { json: { id: "trash12345", webViewLink: "https://x/t", trashed: true } },
      { json: { files: [{ id: "live1234567", webViewLink: "https://x/l" }] } },
      { json: { sheets: [{ properties: { sheetId: 0, title: "Loker" } }] } },
    ];
    expect((await ensureSheet("tok", "trash12345")).id).toBe("live1234567");
  });

  it("error selain 404 dilempar apa adanya sebagai GoogleError", async () => {
    responses = [{ status: 403, json: { error: "insufficient authentication scopes" } }];
    await expect(ensureSheet("tok", "abc12345678")).rejects.toMatchObject({ status: 403 });
    expect(new GoogleError(401, "x")).toBeInstanceOf(Error);
  });
});

describe("baca dan tulis baris", () => {
  const sheet = { id: "abc12345678", url: "https://x", tab: "Loker" };

  it("readRows meminta A1:S dan mengembalikan values", async () => {
    responses = [{ json: { values: [["ID"], ["1"]] } }];
    expect(await readRows("tok", sheet)).toEqual([["ID"], ["1"]]);
    expect(decoded(calls[0])).toContain("'Loker'!A1:T");
    expect((await (async () => { responses = [{ json: {} }]; return readRows("tok", sheet); })())).toEqual([]);
  });

  it("writeRows memakai RAW (tanpa formula) dan header di baris pertama", async () => {
    responses = [{ json: {} }];
    await writeRows("tok", sheet, [["a", "b"]], 1);
    expect(calls[0].method).toBe("PUT");
    expect(calls[0].url).toContain("valueInputOption=RAW");
    expect(calls[0].body).toEqual({ values: [[...HEADER], ["a", "b"]] });
    expect(calls).toHaveLength(1);
  });

  it("writeRows mengosongkan sisa baris lama saat jumlah baris menyusut", async () => {
    responses = [{ json: {} }, { json: {} }];
    await writeRows("tok", sheet, [["a"]], 6); // sebelumnya 6 baris, sekarang header + 1 = 2
    expect(calls).toHaveLength(2);
    expect(decoded(calls[1])).toContain("'Loker'!A3:T6:clear");
    expect(calls[1].method).toBe("POST");
  });

  it("nama tab dengan tanda kutip di-escape", async () => {
    responses = [{ json: {} }];
    await writeRows("tok", { ...sheet, tab: "Loker's" }, [], 0);
    expect(decoded(calls[0])).toContain("'Loker''s'!A1");
  });

  it("token dikirim sebagai Bearer", async () => {
    responses = [{ json: {} }];
    await readRows("rahasia", sheet);
    const init = (fetch as unknown as { mock: { calls: [unknown, RequestInit][] } }).mock.calls[0][1];
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer rahasia");
  });
});

describe("readKnownSheet (jalur cepat)", () => {
  it("satu permintaan baca ke tab Loker", async () => {
    const { readKnownSheet } = await import("./google");
    responses = [{ json: { values: [["ID"]] } }];
    const r = await readKnownSheet("tok", "abc12345678");
    expect(r?.rows).toEqual([["ID"]]);
    expect(r?.sheet.url).toBe("https://docs.google.com/spreadsheets/d/abc12345678/edit");
    expect(calls).toHaveLength(1);
    expect(decoded(calls[0])).toContain("'Loker'!A1:T");
  });

  it("404 / 400 (file atau tab hilang) → null, error lain dilempar", async () => {
    const { readKnownSheet } = await import("./google");
    responses = [{ status: 404 }];
    expect(await readKnownSheet("tok", "abc12345678")).toBeNull();
    responses = [{ status: 400 }];
    expect(await readKnownSheet("tok", "abc12345678")).toBeNull();
    responses = [{ status: 403, json: {} }];
    await expect(readKnownSheet("tok", "abc12345678")).rejects.toMatchObject({ status: 403 });
  });
});
