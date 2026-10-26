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

  it("teks halaman lowongan berbahasa Inggris (Ctrl+A, Ctrl+C)", () => {
    const page = [
      "All jobs / Design / Product Design",
      "Senior Product Designer",
      "Posted 23 days ago",
      "Contoh Sehat is hiring a remote Senior Product Designer to join their remote Design team.",
      "About the job",
      "Posted on",
      "23 days ago",
      "Apply before",
      "Oct 31th, 2026",
      "Job type",
      "Full-Time",
      "Category",
      "Design",
    ].join("\n");
    expect(parsePostText(page, NOW)).toMatchObject({
      title: "Senior Product Designer",
      company: "Contoh Sehat",
      deadline: "2026-10-31",
      type: "Full-time",
      mode: "Remote",
      level: "Senior",
    });
  });

  it("postingan Threads: 'Hiring ✨ Posisi (Remote)', kata ganti bukan perusahaan", () => {
    const post = [
      "Hiring ✨ UI/UX Designer (Remote)",
      "",
      "🧠 A leading organization in open-source AI. They are hiring a UI/UX Designer to define the future of human-AI interaction. Fully remote.",
      "",
      "👤 UI/UX Designer (Remote)",
      "",
      "🚀 Apply: Link in bio",
      "",
      "Lead Id: 17706",
    ].join("\n");
    const f = parsePostText(post, NOW);
    expect(f.title).toBe("UI/UX Designer");
    expect(f.mode).toBe("Remote");
    expect(f.company).toBeUndefined(); // "They" bukan perusahaan; organisasinya memang tidak disebut
    expect(f.notes).toContain("Lead Id: 17706");
  });

  it("kartu lowongan hasil OCR: posisi, perusahaan, lokasi, gaji, tanggal posting; sisa logo dibuang", () => {
    // Struktur dan noise sama dengan hasil pembacaan gambar kartu JobStreet; nama perusahaan diganti.
    const ocr = [
      "Industrial Designer",
      "",
      "Studio Belajar Limited C0)",
      "Baru untuk kamu",
      "",
      "Jakarta Selatan, Jakarta Raya",
      "",
      "Rp 7,000,000 - Rp 9,000,000 per month",
      "",
      "+ Good career path",
      "+ Collaborative work environment",
      "",
      "Our Studio Belajar family is looking for a creative and",
      "enthusiastic individual to join our growing team.",
      "",
      "27 hari yang lalu « Segera ditutup vn",
    ].join("\n");
    const f = parsePostText(ocr, NOW);
    expect(f).toMatchObject({
      title: "Industrial Designer",
      company: "Studio Belajar Limited",
      city: "Jakarta Selatan",
      salary: "Rp 7–9 jt",
      postedAt: "2026-09-27",
    });
  });

  it("sisa logo di ujung nama perusahaan dibuang, nama asli tidak rusak", () => {
    const card = (company: string) => `Data Analyst\n${company}\nBandung, Jawa Barat\nRp 8,000,000 per month\n3 days ago`;
    expect(parsePostText(card("Studio Belajar Limited OR"), NOW).company).toBe("Studio Belajar Limited");
    expect(parsePostText(card("Maju Jaya Ltd XY"), NOW).company).toBe("Maju Jaya Ltd");
    expect(parsePostText(card("Toko Kopi Senja Q"), NOW).company).toBe("Toko Kopi Senja");
    // nama pendek dan nama yang memang berakhiran huruf kapital pendek tidak dipotong
    expect(parsePostText(card("Studio X"), NOW).company).toBe("Studio X");
    expect(parsePostText(card("Bank Jago"), NOW).company).toBe("Bank Jago");
  });

  it("dua baris pendek tanpa tanda lowongan tidak dianggap kartu", () => {
    const f = parsePostText("Selamat Pagi\nTim Kreatif\nSampai jumpa", NOW);
    expect(f.title).toBeUndefined();
    expect(f.company).toBeUndefined();
  });

  it("tanggal relatif Indonesia dan Inggris", () => {
    expect(parsePostText("Dicari: QA\nDiposting 3 minggu yang lalu", NOW).postedAt).toBe("2026-10-03");
    expect(parsePostText("Dicari: QA\nPosted 2 days ago", NOW).postedAt).toBe("2026-10-22");
    expect(parsePostText("Dicari: QA\n5 jam yang lalu", NOW).postedAt).toBe("2026-10-24");
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
