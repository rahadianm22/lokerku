import { describe, expect, it } from "vitest";
import { parseShared } from "./share";

describe("parseShared (menu Bagikan Android)", () => {
  it("link di parameter url", () => {
    expect(parseShared("https://www.linkedin.com/jobs/view/123", null, null)).toEqual({ url: "https://www.linkedin.com/jobs/view/123" });
  });

  it("link terselip di text, teks lainnya disimpan tanpa link", () => {
    expect(parseShared(null, "Lihat lowongan ini: https://id.jobstreet.com/id/job/987.", "Data Analyst")).toEqual({
      url: "https://id.jobstreet.com/id/job/987",
      text: "Data Analyst\nLihat lowongan ini:",
    });
  });

  it("hanya teks (mis. caption yang disalin)", () => {
    expect(parseShared(null, "Hiring UI/UX Designer (Remote)", null)).toEqual({ text: "Hiring UI/UX Designer (Remote)" });
  });

  it("kosong atau link bukan http(s) diabaikan", () => {
    expect(parseShared(null, null, null)).toBeNull();
    expect(parseShared("javascript:alert(1)", "  ", "")).toBeNull();
  });
});
