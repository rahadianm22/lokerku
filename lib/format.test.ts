import { describe, expect, it } from "vitest";
import {
  avatarTint, computeStats, deadlineBadge, deadlineDiff, fmtDate, fmtPosted, fmtRelative, fmtSent,
  fmtSentShort, initial, isoWib, matchesQuery, parseYmd, sortJobs, tintIndex, todayYmd,
} from "./format";
import { SEED } from "./seed";

const wib = (s: string) => Date.parse(`${s}+07:00`);
const NOW = wib("2026-10-23T11:14:00");

describe("tanggal WIB", () => {
  it("format Dikirim", () => {
    expect(fmtSent(wib("2026-10-23T09:14:00"))).toBe("23 Okt, 09:14 WIB");
    expect(fmtSentShort(wib("2026-08-02T07:05:00"))).toBe("2 Agu · 07:05");
  });

  it("memakai zona WIB walau jam UTC beda hari", () => {
    // 23:30 UTC = 06:30 WIB keesokan harinya
    expect(fmtSent(Date.parse("2026-05-31T23:30:00Z"))).toBe("1 Jun, 06:30 WIB");
  });

  it("fmtDate & fmtPosted", () => {
    expect(fmtDate("2026-10-25")).toBe("25 Okt 2026");
    expect(fmtDate(null)).toBe("");
    expect(fmtPosted("2026-10-18")).toBe("Diposting 18 Okt");
    expect(fmtPosted(null)).toBe("Tgl posting belum ada");
  });

  it("parseYmd menolak format salah", () => {
    expect(parseYmd("2026-13-01")).toBeNull();
    expect(parseYmd("25/10/2026")).toBeNull();
    expect(parseYmd("2026-10-25")?.d).toBe(25);
  });

  it("todayYmd & isoWib", () => {
    expect(todayYmd(Date.parse("2026-10-22T18:00:00Z"))).toBe("2026-10-23");
    expect(isoWib(wib("2026-10-23T09:14:05"))).toBe("2026-10-23T09:14:05+07:00");
  });
});

describe("fmtRelative", () => {
  it.each([
    [NOW - 30_000, "Baru saja"],
    [NOW - 5 * 60_000, "5 menit yang lalu"],
    [NOW - 2 * 3_600_000, "2 jam yang lalu"],
    [wib("2026-10-22T09:00:00"), "Kemarin"],
    [wib("2026-10-20T09:00:00"), "3 hari yang lalu"],
    [wib("2026-10-09T13:45:00"), "2 minggu yang lalu"],
  ])("%s → %s", (ts, out) => {
    expect(fmtRelative(ts, NOW)).toBe(out);
  });

  it("kemarin dihitung per hari kalender, bukan 24 jam", () => {
    // 22 Okt 20:41 ke 23 Okt 11:14 = 14,5 jam tapi tetap "jam yang lalu" karena < 24 jam
    expect(fmtRelative(wib("2026-10-22T20:41:00"), NOW)).toBe("14 jam yang lalu");
  });
});

describe("deadline", () => {
  it("selisih hari kalender", () => {
    expect(deadlineDiff("2026-10-23", NOW)).toBe(0);
    expect(deadlineDiff("2026-10-25", NOW)).toBe(2);
    expect(deadlineDiff("2026-10-12", NOW)).toBe(-11);
    expect(deadlineDiff(null, NOW)).toBeNull();
  });

  it("badge sesuai aturan", () => {
    expect(deadlineBadge(null, "saved", NOW)).toBeNull();
    expect(deadlineBadge("2026-10-20", "saved", NOW)).toEqual({ label: "Lewat", tone: "past" });
    expect(deadlineBadge("2026-10-20", "offer", NOW)).toEqual({ label: "Lewat", tone: "past" });
    expect(deadlineBadge("2026-10-25", "offer", NOW)).toBeNull();
    expect(deadlineBadge("2026-10-23", "saved", NOW)).toEqual({ label: "Hari ini", tone: "urgent" });
    expect(deadlineBadge("2026-10-26", "applied", NOW)).toEqual({ label: "3 hari", tone: "urgent" });
    expect(deadlineBadge("2026-10-31", "applied", NOW)).toEqual({ label: "8 hari lagi", tone: "far" });
  });
});

describe("stats dari data contoh §13", () => {
  it("cocok dengan hasil yang diharapkan", () => {
    expect(computeStats(SEED, NOW)).toEqual({ total: 5, week: 3, applied: 4, appliedPct: 80, interview: 1, dueSoon: 2 });
  });

  it("kosong aman", () => {
    expect(computeStats([], NOW).appliedPct).toBe(0);
  });
});

describe("sort & search", () => {
  const ids = (k: Parameters<typeof sortJobs>[1]) => sortJobs(SEED, k, NOW).map((j) => j.company);

  it("Terbaru", () => expect(ids("new")).toEqual(["Xendit", "Bank Jago", "Mekari", "Traveloka", "Ruangguru"]));
  it("Deadline terdekat: tanpa/lewat di akhir", () =>
    expect(ids("deadline")).toEqual(["Xendit", "Mekari", "Bank Jago", "Traveloka", "Ruangguru"]));
  it("Prioritas lalu terbaru", () =>
    expect(ids("priority")).toEqual(["Xendit", "Mekari", "Bank Jago", "Traveloka", "Ruangguru"]));
  it("Perusahaan A–Z", () => expect(ids("az")).toEqual(["Bank Jago", "Mekari", "Ruangguru", "Traveloka", "Xendit"]));
  it("tidak mengubah array asli", () => {
    const copy = [...SEED];
    sortJobs(SEED, "az", NOW);
    expect(SEED).toEqual(copy);
  });

  it("search case-insensitive di company, title, city, platform", () => {
    const hit = (q: string) => SEED.filter((j) => matchesQuery(j, q)).map((j) => j.id);
    expect(hit("XENDIT")).toEqual(["seed-1"]);
    expect(hit("lead")).toEqual(["seed-4"]);
    expect(hit("yogya")).toEqual(["seed-3"]);
    expect(hit("kalibrr")).toEqual(["seed-3"]);
    expect(hit("  ")).toHaveLength(5);
  });
});

describe("avatar", () => {
  it("tint stabil per nama", () => {
    expect(tintIndex("Xendit")).toBe(tintIndex("Xendit"));
    expect(avatarTint("Xendit", false)).not.toEqual(avatarTint("Xendit", true));
  });
  it("inisial tanpa PT", () => {
    expect(initial("PT Sinar Jaya")).toBe("S");
    expect(initial("")).toBe("?");
    expect(initial("ruangguru")).toBe("R");
  });
});
