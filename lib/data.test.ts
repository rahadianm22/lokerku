import { describe, expect, it } from "vitest";
import { parseBackup, toBackup } from "./backup";
import { csvCell, toCsv } from "./csv";
import { fromLegacy } from "./legacy";
import { differs, mergeJobs, TOMBSTONE_TTL } from "./merge";
import { detectedLabel, detectPlatform } from "./platform";
import { SEED } from "./seed";
import { HEADER, jobToRow, parseDateCell, rowsToJobs, rowToJob } from "./sheet-codec";
import type { Job } from "./types";
import { normalizeUrl, safeHref, toHttpUrl } from "./url";

const job = (over: Partial<Job> = {}): Job => ({ ...SEED[0], ...over });
let n = 0;
const newId = () => `new-${++n}`;

describe("platform", () => {
  it.each([
    ["https://www.linkedin.com/jobs/view/1", "LinkedIn"],
    ["id.jobstreet.com/id/job/1", "JobStreet"],
    ["https://glints.com/id/opportunities/jobs/x", "Glints"],
    ["https://www.kalibrr.id/c/a/jobs/1", "Kalibrr"],
    ["https://id.indeed.com/viewjob?jk=1", "Indeed"],
    ["https://dealls.com/loker/ui-designer", "Dealls"],
    ["https://www.kitalulus.com/lowongan/1", "KitaLulus"],
    ["https://www.karir.com/opportunities/1", "Karir.com"],
    ["https://karier.perusahaan.com/lowongan/1", "Situs perusahaan"],
    ["https://www.topkarir.com/lowongan/1", "TopKarir"],
    ["https://www.glassdoor.com/job-listing/x", "Glassdoor"],
    ["https://id.techinasia.com/jobs/x", "Tech in Asia"],
    ["https://wellfound.com/jobs/1", "Wellfound"],
    ["https://angel.co/company/x/jobs", "Wellfound"],
    ["https://www.instagram.com/p/abc/", "Instagram"],
    ["https://x.com/perusahaan/status/1", "X"],
    ["https://twitter.com/perusahaan/status/1", "X"],
    ["https://t.me/lokerchannel/12", "Lainnya"],
    ["https://forms.gle/abc", "Lainnya"],
    ["https://jobs.lever.co/acme/1", "Situs perusahaan"],
    ["https://karier.contoh.co.id/lowongan/1", "Situs perusahaan"],
  ])("%s → %s", (url, p) => expect(detectPlatform(url)).toBe(p));

  it("bukan URL", () => {
    expect(detectPlatform("halo")).toBeNull();
    expect(detectPlatform("")).toBeNull();
  });

  it("label chip", () => {
    expect(detectedLabel("Glints")).toBe("Glints terdeteksi");
    expect(detectedLabel("Situs perusahaan")).toBe("Halaman karier perusahaan");
  });
});

describe("url", () => {
  it("melengkapi protokol dan menolak skema lain", () => {
    expect(toHttpUrl("glints.com/x")).toBe("https://glints.com/x");
    expect(toHttpUrl("javascript:alert(1)")).toBe("");
    expect(toHttpUrl("ftp://a.com")).toBe("");
    expect(toHttpUrl("localhost")).toBe("");
  });

  it("normalisasi untuk cek duplikat", () => {
    const a = normalizeUrl("https://www.linkedin.com/jobs/view/123/?utm_source=x&trk=abc#top");
    const b = normalizeUrl("linkedin.com/jobs/view/123");
    expect(a).toBe(b);
    expect(normalizeUrl("https://a.com/x?id=2&b=1")).toBe("a.com/x?b=1&id=2");
  });

  it("safeHref hanya http(s)", () => {
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
    expect(safeHref("data:text/html,x")).toBeUndefined();
    expect(safeHref("https://a.com")).toBe("https://a.com/");
    expect(safeHref("")).toBeUndefined();
  });
});

describe("merge (sinkron)", () => {
  it("updatedAt lebih baru menang", () => {
    const old = job({ status: "saved", updatedAt: 1 });
    const fresh = job({ status: "offer", updatedAt: 2 });
    expect(mergeJobs([old], [fresh], 10)[0].status).toBe("offer");
    expect(mergeJobs([fresh], [old], 10)[0].status).toBe("offer");
  });

  it("seri dengan isi beda: Sheet (base) menang dan updatedAt dinaikkan", () => {
    const sheet = job({ notes: "diedit di Sheet", updatedAt: 5 });
    const local = job({ notes: "", updatedAt: 5 });
    const [m] = mergeJobs([sheet], [local], 99);
    expect(m.notes).toBe("diedit di Sheet");
    expect(m.updatedAt).toBe(99);
  });

  it("menggabungkan id berbeda dan membuang tombstone kedaluwarsa", () => {
    const now = TOMBSTONE_TTL * 3;
    const a = job({ id: "a" });
    const deadOld = job({ id: "b", deletedAt: now - TOMBSTONE_TTL - 1, updatedAt: now - TOMBSTONE_TTL - 1 });
    const deadNew = job({ id: "c", deletedAt: now - 1000, updatedAt: now - 1000 });
    expect(mergeJobs([a, deadOld], [deadNew], now).map((j) => j.id).sort()).toEqual(["a", "c"]);
  });

  it("hapus di satu perangkat menang atas salinan lama", () => {
    const alive = job({ updatedAt: 1 });
    const dead = job({ deletedAt: 2, updatedAt: 2 });
    expect(mergeJobs([alive], [dead], 3)[0].deletedAt).toBe(2);
  });

  it("differs", () => {
    expect(differs(SEED, [...SEED].reverse())).toBe(false);
    expect(differs(SEED, SEED.slice(1))).toBe(true);
    expect(differs([job()], [job({ notes: "x" })])).toBe(true);
  });
});

describe("sheet codec", () => {
  it("bolak-balik tanpa kehilangan data", () => {
    for (const j of SEED) {
      const back = rowToJob(jobToRow({ ...j, logoUrl: "https://x.com/l.png" }), 0, newId);
      expect(back).toEqual({ ...j, logoUrl: "https://x.com/l.png", deletedAt: null });
    }
  });

  it("header + baris, lewati baris kosong dan id ganda", () => {
    const rows = [[...HEADER], jobToRow(SEED[0]), [], jobToRow(SEED[0]), jobToRow(SEED[1])];
    expect(rowsToJobs(rows, 0, newId).map((j) => j.id)).toEqual(["seed-1", "seed-2"]);
  });

  it("baris yang ditambah manual di Sheet: tanpa ID, label status, tanggal format Indonesia", () => {
    const row = ["", "PT Contoh", "Data Analyst", "sudah apply", "Bandung", "remote", "", "", "", "", "", "31/12/2026", "Tinggi"];
    const j = rowToJob(row, 1234, () => "baru")!;
    expect(j).toMatchObject({
      id: "baru", company: "PT Contoh", status: "applied", mode: "Remote", type: "Full-time", level: "Mid",
      platform: "Lainnya", deadline: "2026-12-31", priority: "high", createdAt: 1234, updatedAt: 1234,
    });
  });

  it("parseDateCell", () => {
    expect(parseDateCell("2026-10-25")).toBe("2026-10-25");
    expect(parseDateCell("5/1/2026")).toBe("2026-01-05");
    expect(parseDateCell("bukan tanggal")).toBeNull();
    expect(parseDateCell("")).toBeNull();
  });
});

describe("csv", () => {
  it("escape dan cegah formula", () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell("baris\nbaru")).toBe('"baris\nbaru"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
  });

  it("BOM, header, satu baris per loker", () => {
    const out = toCsv(SEED);
    expect(out.startsWith("﻿Perusahaan,Posisi,Status")).toBe(true);
    expect(out.split("\r\n")).toHaveLength(SEED.length + 1);
    expect(out).toContain("Xendit,Senior Product Designer,Interview");
    expect(out).toContain("2026-10-23T09:14:00+07:00");
  });
});

describe("backup", () => {
  it("bolak-balik", () => {
    expect(parseBackup(toBackup(SEED))).toEqual(SEED);
  });
  it("menolak file asing", () => {
    expect(parseBackup("{}")).toBeNull();
    expect(parseBackup("bukan json")).toBeNull();
    expect(parseBackup(JSON.stringify({ app: "lokerku", version: 1, jobs: [{ id: 1 }] }))).toBeNull();
  });
});

describe("migrasi localStorage lama", () => {
  it("memetakan bentuk lama ke model baru", () => {
    const [j] = fromLegacy([
      {
        id: "x", url: "https://glints.com/a", company: "A", title: "B", location: "Bandung", workMode: "onsite",
        employmentType: "Contract", seniority: "Intern", postedAt: "2026-10-01T17:00:00.000Z",
        deadline: null, status: "archived", priority: "high", notes: "n", addedAt: "2026-10-02T00:00:00.000Z",
        updatedAt: "2026-10-02T00:00:00.000Z", logo: null,
      },
    ]);
    expect(j).toMatchObject({
      platform: "Glints", city: "Bandung", mode: "On-site", type: "Kontrak", level: "Junior",
      postedAt: "2026-10-02", status: "archive", priority: "high",
    });
  });
  it("abaikan data rusak", () => {
    expect(fromLegacy("x")).toEqual([]);
    expect(fromLegacy([{ id: 1 }, null])).toEqual([]);
  });
});
