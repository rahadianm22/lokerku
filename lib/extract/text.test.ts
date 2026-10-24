import { describe, expect, it } from "vitest";
import { parsePostText } from "./text";

const NOW = Date.parse("2026-10-24T10:00:00+07:00");

// Struktur sama dengan caption Instagram yang dilaporkan, nama diganti.
const CAPTION = `UI/UX DESIGNER, WE NEED YOU! 👀🎨

Punya eye for design dan jago bikin user experience yang nggak cuma cakep, tapi juga works?
Studio Contoh lagi cari partner buat ngulik ide dan bikin digital experience yang next level!

💻 Positions Available: UI/UX Designer

Think you're the one? 👀
Gas kirim portofolio dan case study terbaikmu.
Let's create something cool with Studio Contoh! 🚀

#hiring #uiuxdesigner #creativestudio #agencylife #lokerdesigner`;

describe("parsePostText", () => {
  it("caption Instagram: posisi dari 'Positions Available', perusahaan dari 'lagi cari'", () => {
    const f = parsePostText(CAPTION, NOW);
    expect(f.title).toBe("UI/UX Designer");
    expect(f.company).toBe("Studio Contoh");
    expect(f.notes).toContain("UI/UX DESIGNER, WE NEED YOU!");
  });

  it("tanpa kata kunci, posisi dari baris pertama yang berteriak", () => {
    expect(parsePostText("SENIOR PRODUCT DESIGNER DIBUTUHKAN!\nKantor di Bandung", NOW).title).toBe("Senior Product Designer");
    expect(parsePostText("Frontend Engineer, we're hiring!", NOW).title).toBe("Frontend Engineer");
  });

  it("PT/CV dikenali sebagai perusahaan", () => {
    expect(parsePostText("Lowongan: Admin Gudang\nPT Sinar Mandiri Jaya membuka lowongan", NOW).company).toBe("PT Sinar Mandiri Jaya");
  });

  it("lokasi, gaji, mode, level, email", () => {
    const f = parsePostText(
      "Dicari: Senior Data Analyst\nLokasi: Surabaya\nGaji Rp 12.000.000 - Rp 15.000.000\nBisa WFH penuh\nKirim CV ke hrd.contoh@gmail.com",
      NOW,
    );
    expect(f).toMatchObject({ title: "Senior Data Analyst", city: "Surabaya", salary: "Rp 12–15 jt", mode: "Remote", level: "Senior" });
    expect(f.notes).toMatch(/^Kirim lamaran ke hrd\.contoh@gmail\.com/);
  });

  it("deadline hanya dari kata kunci yang jelas, tahun dilengkapi", () => {
    expect(parsePostText("Dicari: QA\nDeadline: 31 Oktober 2026", NOW).deadline).toBe("2026-10-31");
    expect(parsePostText("Dicari: QA\nSampai 5 Nov", NOW).deadline).toBe("2026-11-05");
    expect(parsePostText("Dicari: QA\nSampai 5 Jan", NOW).deadline).toBe("2027-01-05"); // sudah lewat → tahun depan
    expect(parsePostText("Dicari: QA\nby 5 days of work", NOW).deadline).toBeUndefined();
    expect(parsePostText("Dicari: QA\nTanggal 31 Oktober ada acara", NOW).deadline).toBeUndefined();
  });

  it("tidak menebak yang tidak jelas", () => {
    const f = parsePostText("Halo semua, ada info seru nih. Cek bio ya!", NOW);
    expect(f.title).toBeUndefined();
    expect(f.company).toBeUndefined();
    expect(f.city).toBeUndefined();
    expect(f.salary).toBeUndefined();
    expect(f.notes).toContain("Halo semua");
  });

  it("kosong aman", () => {
    expect(parsePostText("   ", NOW)).toEqual({});
  });
});
