import { describe, expect, it } from "vitest";
import { appliedAt, cellToHistory, historyToCell, initialHistory, timeline, withStatusChange } from "./history";
import { mergeJobs } from "./merge";
import { SEED } from "./seed";
import { jobToRow, rowToJob } from "./sheet-codec";
import type { Job } from "./types";

const wib = (s: string) => Date.parse(`${s}+07:00`);
const base: Job = { ...SEED[1], status: "saved", createdAt: wib("2026-10-01T09:00:00"), updatedAt: wib("2026-10-01T09:00:00"), history: undefined };

describe("riwayat status", () => {
  it("loker lama tanpa riwayat: status awal dianggap sejak dibuat", () => {
    const h = withStatusChange(base, "applied", wib("2026-10-03T10:12:00"));
    expect(h).toEqual([
      { status: "saved", at: wib("2026-10-01T09:00:00") },
      { status: "applied", at: wib("2026-10-03T10:12:00") },
    ]);
  });

  it("status yang sama tidak menambah entri", () => {
    const h = initialHistory("applied", 1);
    expect(withStatusChange({ ...base, status: "applied", history: h }, "applied", 2)).toBe(h);
  });

  it("tanggal apply = pertama kali masuk Sudah Apply atau tahap sesudahnya", () => {
    const job: Job = {
      ...base,
      status: "interview",
      history: [
        { status: "saved", at: 1 },
        { status: "interview", at: 5 }, // langsung interview tanpa tercatat apply
        { status: "offer", at: 9 },
      ],
    };
    expect(appliedAt(job)).toBe(5);
    expect(appliedAt(base)).toBeUndefined();
  });

  it("status diubah langsung di Sheet: timeline tetap berakhir di status sekarang", () => {
    const job: Job = { ...base, status: "offer", updatedAt: 99, history: [{ status: "saved", at: 1 }] };
    expect(timeline(job).at(-1)).toEqual({ status: "offer", at: 99 });
  });

  it("kolom Riwayat di Sheet bolak-balik dan toleran", () => {
    const h = [
      { status: "saved" as const, at: wib("2026-10-01T09:00:00") },
      { status: "applied" as const, at: wib("2026-10-03T10:12:00") },
    ];
    const cell = historyToCell(h);
    expect(cell).toBe("2026-10-01 09:00 Disimpan; 2026-10-03 10:12 Sudah Apply");
    expect(cellToHistory(cell)).toEqual(h);
    // diedit manual: tanpa jam, huruf kecil, entri rusak dilewati
    expect(cellToHistory("2026-10-05 interview; kemarin Offer; ")).toEqual([{ status: "interview", at: wib("2026-10-05T00:00:00") }]);
    expect(cellToHistory("")).toBeUndefined();
  });

  it("codec Sheet membawa riwayat", () => {
    const job: Job = { ...base, history: [{ status: "saved", at: wib("2026-10-01T09:00:00") }] };
    expect(rowToJob(jobToRow(job), 0, () => "x")?.history).toEqual(job.history);
  });

  it("merge melihat perbedaan riwayat sebagai perubahan isi", () => {
    const a: Job = { ...base, updatedAt: 5, history: [{ status: "saved", at: 1 }] };
    const b: Job = { ...a, history: [{ status: "saved", at: 1 }, { status: "applied", at: 5 }] };
    // seri updatedAt, isi beda → Sheet (base) menang dan dinaikkan
    expect(mergeJobs([a], [b], 50)[0].updatedAt).toBe(50);
  });
});
