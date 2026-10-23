import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";

describe("parseSettings", () => {
  it("kosong atau bukan JSON → bawaan", () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("bukan json")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("42")).toEqual(DEFAULT_SETTINGS);
  });

  it("membaca nilai yang valid", () => {
    const raw = JSON.stringify({ autoSave: true, defaultStatus: "applied", defaultPriority: "high" });
    expect(parseSettings(raw)).toEqual({ autoSave: true, defaultStatus: "applied", defaultPriority: "high" });
  });

  it("kolom rusak kembali ke bawaan tanpa membuang kolom lain", () => {
    const raw = JSON.stringify({ autoSave: true, defaultStatus: "hapus-semua", defaultPriority: 9 });
    expect(parseSettings(raw)).toEqual({ ...DEFAULT_SETTINGS, autoSave: true });
  });

  it("kolom yang belum ada (versi lama) diisi bawaan", () => {
    expect(parseSettings(JSON.stringify({ autoSave: true }))).toEqual({ ...DEFAULT_SETTINGS, autoSave: true });
  });
});
