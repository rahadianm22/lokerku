import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isLoginOnly, parseJobHtml, scored } from ".";
import { formatSalary } from "./salary";
import { formatSalaryText } from "./salary-text";
import { detectLevel, detectMode, mapEmploymentType, splitTitle } from "./util";

const fixture = (name: string) => readFileSync(join(__dirname, "__fixtures__", name), "utf8");

describe("parser terhadap fixture", () => {
  it("Glints JSON-LD → complete", () => {
    const r = parseJobHtml(fixture("glints-jsonld.html"), "https://glints.com/id/opportunities/jobs/x");
    expect(r.confidence).toBe("complete");
    expect(r.missing).toEqual([]);
    expect(r.data).toMatchObject({
      title: "Product Designer II",
      company: "Contoh Fintech",
      city: "Jakarta Selatan",
      platform: "Glints",
      type: "Full-time",
      salary: "Rp 18–24 jt",
      postedAt: "2026-10-20",
      deadline: "2026-11-06",
      logoUrl: "https://images.glints.example/logo.png",
      mode: "Hybrid",
    });
  });

  it("LinkedIn publik tanpa gaji & deadline → partial", () => {
    const r = parseJobHtml(fixture("linkedin-public.html"), "https://www.linkedin.com/jobs/view/1");
    expect(r.confidence).toBe("partial");
    expect(r.missing).toEqual(["salary", "postedAt", "deadline"]);
    expect(r.data).toMatchObject({
      title: "Senior UI/UX Designer",
      company: "Contoh Pay",
      city: "Jakarta Selatan",
      type: "Full-time",
      level: "Senior",
      mode: "Hybrid",
    });
  });

  it("JobStreet DOM → complete dengan gaji dirapikan", () => {
    const r = parseJobHtml(fixture("jobstreet-dom.html"), "https://id.jobstreet.com/id/job/1");
    expect(r.confidence).toBe("complete");
    expect(r.data).toMatchObject({
      title: "Data Analyst",
      company: "Contoh Retail",
      city: "Bandung",
      type: "Kontrak",
      salary: "Rp 8–12 jt",
    });
  });

  it("Indeed DOM → complete, gaji dirapikan", () => {
    const r = parseJobHtml(fixture("indeed-dom.html"), "https://id.indeed.com/viewjob?jk=abc");
    expect(r.confidence).toBe("complete");
    expect(r.data).toMatchObject({
      platform: "Indeed",
      title: "Marketing Executive",
      company: "Contoh Dagang",
      city: "Bandung",
      salary: "Rp 6–8 jt",
    });
  });

  it("Greenhouse tanpa JSON-LD: perusahaan dari <title>, lokasi dari og:description", () => {
    const r = parseJobHtml(fixture("greenhouse-board.html"), "https://job-boards.eu.greenhouse.io/contohkripto/jobs/1234567?gh_src=abc");
    expect(r.data).toMatchObject({
      platform: "Situs perusahaan",
      title: "Senior Product Designer, Web3",
      company: "Contoh Kripto",
      city: "Vienna",
      level: "Senior",
    });
    expect(r.data.logoUrl).toContain("greenhouse.io");
    expect(r.missing).toEqual(["salary", "postedAt", "deadline"]);
    expect(r.confidence).toBe("partial");
  });

  it("JSON-LD dengan baris baru mentah (tidak valid) tetap terbaca", () => {
    const r = parseJobHtml(fixture("jsonld-raw-newline.html"), "https://papan.example/remote-jobs/contoh-sehat-senior-product-designer");
    expect(r.data).toMatchObject({
      title: "Senior Product Designer", // dari JSON-LD, bukan og:title "Remote Senior Product Designer"
      company: "Contoh Sehat",
      city: "United States of America",
      type: "Full-time",
      mode: "Remote",
      postedAt: "2026-10-01",
      deadline: "2026-10-31",
    });
    expect(r.data.salary).toBeUndefined(); // gaji 0–0 berarti tidak dicantumkan
    expect(r.missing).toEqual(["salary"]);
    expect(r.confidence).toBe("complete");
  });

  it("cangkang Instagram (judul cuma 'Instagram') → failed, bukan judul posisi", () => {
    const r = parseJobHtml("<html><head><title>Instagram</title></head><body></body></html>", "https://www.instagram.com/p/abc/");
    expect(r.confidence).toBe("failed");
    expect(r.data.title).toBeUndefined();
    expect(r.data.platform).toBe("Instagram");
  });

  it("isLoginOnly: Instagram dan X saja", () => {
    expect(isLoginOnly("https://www.instagram.com/p/abc/")).toBe(true);
    expect(isLoginOnly("https://x.com/a/status/1")).toBe(true);
    expect(isLoginOnly("https://twitter.com/a/status/1")).toBe(true);
    expect(isLoginOnly("https://www.linkedin.com/jobs/view/1")).toBe(false);
    expect(isLoginOnly("https://careers.contoh.com/j/1")).toBe(false);
  });

  it("halaman login → failed", () => {
    const r = parseJobHtml(fixture("login-wall.html"), "https://www.linkedin.com/jobs/view/1");
    expect(r.confidence).toBe("failed");
    expect(r.data.platform).toBe("LinkedIn");
  });

  it("situs karier dengan <title> saja → partial, level & mode dari heuristik", () => {
    const r = parseJobHtml(fixture("career-meta.html"), "https://careers.contoh.dev/jobs/9");
    expect(r.confidence).toBe("partial");
    expect(r.data).toMatchObject({
      title: "Lead Backend Engineer",
      company: "Contoh Labs",
      platform: "Situs perusahaan",
      level: "Lead",
      mode: "Remote",
    });
  });

  it("halaman kosong → failed", () => {
    expect(parseJobHtml("<html></html>", "https://a.com/x").confidence).toBe("failed");
  });
});

describe("aturan confidence", () => {
  it("complete butuh company, title, city + salary atau deadline", () => {
    expect(scored({ company: "A", title: "B", city: "C", deadline: "2026-01-01" }).confidence).toBe("complete");
    expect(scored({ company: "A", title: "B", city: "C" }).confidence).toBe("partial");
    expect(scored({ city: "C" }).confidence).toBe("failed");
  });
});

describe("gaji", () => {
  it.each([
    [{ currency: "IDR", value: { minValue: 25e6, maxValue: 32e6, unitText: "MONTH" } }, "Rp 25–32 jt"],
    [{ currency: "IDR", value: { value: 15e6, unitText: "MONTH" } }, "Rp 15 jt"],
    [{ currency: "IDR", value: { minValue: 120e6, maxValue: 180e6, unitText: "YEAR" } }, "Rp 10–15 jt"],
    [{ currency: "IDR", value: { minValue: 8.5e6, maxValue: 9e6 } }, "Rp 8,5–9 jt"],
    [{ currency: "USD", value: { minValue: 2000, maxValue: 3000, unitText: "MONTH" } }, "USD 2.000–3.000"],
    [{ currency: "IDR", value: { minValue: 50000, maxValue: 75000, unitText: "HOUR" } }, "Rp 50.000–75.000 / jam"],
    [null, ""],
    [{ currency: "IDR", value: {} }, ""],
  ])("%j → %s", (input, out) => expect(formatSalary(input)).toBe(out));

  it("teks gaji bebas", () => {
    expect(formatSalaryText("Rp 8.000.000 – Rp 12.000.000 per month")).toBe("Rp 8–12 jt");
    expect(formatSalaryText("IDR 10jt - 15jt")).toBe("Rp 10–15 jt");
    expect(formatSalaryText("Rp 180.000.000 per tahun")).toBe("Rp 15 jt");
    expect(formatSalaryText("Kompetitif")).toBe("Kompetitif");
    expect(formatSalaryText("")).toBe("");
  });
});

describe("heuristik", () => {
  it("mode kerja", () => {
    expect(detectMode("WFH full")).toBe("Remote");
    expect(detectMode("Hybrid, 3 hari WFO")).toBe("Hybrid");
    expect(detectMode("wajib WFO")).toBe("On-site");
    expect(detectMode("Jakarta")).toBeUndefined();
  });
  it("level dari judul", () => {
    expect(detectLevel("Sr. Engineer")).toBe("Senior");
    expect(detectLevel("Engineering Manager")).toBe("Manager");
    expect(detectLevel("Junior Analyst")).toBe("Junior");
    expect(detectLevel("Intern Marketing")).toBe("Junior");
    expect(detectLevel("Designer")).toBeUndefined();
  });
  it("tipe kerja", () => {
    expect(mapEmploymentType(["CONTRACTOR"])).toBe("Kontrak");
    expect(mapEmploymentType("INTERN")).toBe("Magang");
    expect(mapEmploymentType("Penuh Waktu")).toBe("Full-time");
    expect(mapEmploymentType(undefined)).toBeUndefined();
  });
  it("pola judul", () => {
    expect(splitTitle("Designer - Contoh | JobStreet")).toEqual({ title: "Designer", company: "Contoh" });
    expect(splitTitle("Lowongan Kerja QA di PT Contoh, Surabaya")).toEqual({ title: "QA", company: "PT Contoh", city: "Surabaya" });
  });
});

describe("tebakan perusahaan", () => {
  it("dari alamat ATS dan domain", async () => {
    const { atsCompany, hostCompany } = await import("./company");
    expect(atsCompany("https://job-boards.eu.greenhouse.io/bitpanda/jobs/1")).toBe("Bitpanda");
    expect(atsCompany("https://jobs.lever.co/acme-corp/abc")).toBe("Acme Corp");
    expect(atsCompany("https://bitpanda.jobs.personio.de/job/1")).toBe("Bitpanda");
    expect(atsCompany("https://contoh.com/jobs/1")).toBe("");
    expect(hostCompany("https://careers.bitpanda.com/jobs/1")).toBe("Bitpanda");
    expect(hostCompany("https://karier.contoh-maju.co.id/lowongan/1")).toBe("Contoh Maju");
    expect(hostCompany("https://www.ruangguru.com/careers")).toBe("Ruangguru");
  });

  it("og:site_name dipakai di situs perusahaan, tidak di papan lowongan", async () => {
    const { guessCompany } = await import("./company");
    const base = { url: "https://careers.contoh.com/j/1", appName: "" };
    expect(guessCompany({ ...base, platform: "Situs perusahaan", siteName: "Contoh Teknologi" })).toBe("Contoh Teknologi");
    expect(guessCompany({ ...base, platform: "Situs perusahaan", siteName: "LinkedIn" })).toBe("Contoh");
    expect(guessCompany({ ...base, platform: "Glints", siteName: "Glints" })).toBe("");
  });
});
