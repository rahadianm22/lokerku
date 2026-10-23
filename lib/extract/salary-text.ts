import { clean } from "./util";

const num = (s: string) => {
  // "8.000.000" / "8,000,000" / "8 jt" / "8,5"
  const n = Number(s.replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

const juta = (n: number) => {
  const v = Math.round((n / 1_000_000) * 10) / 10;
  return Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
};

/**
 * Teks gaji bebas dari halaman ("Rp 8.000.000 – Rp 12.000.000 per month") → 'Rp 8–12 jt'.
 * Kalau polanya tidak dikenali, kembalikan teks aslinya (dipotong) supaya tidak ada info yang hilang.
 */
export function formatSalaryText(raw: string): string {
  const s = clean(raw);
  if (!s) return "";
  const isIdr = /\b(rp|idr)\b/i.test(s);
  const yearly = /(per\s*(year|tahun)|\/\s*(yr|thn|tahun)|annually|setahun)/i.test(s);
  const nums = [...s.matchAll(/(\d[\d.,]*)\s*(jt|juta|rb|ribu|k|m)?/gi)]
    .map((m) => {
      let n = num(m[1]);
      const u = (m[2] ?? "").toLowerCase();
      if (u === "jt" || u === "juta" || u === "m") n *= 1_000_000;
      if (u === "rb" || u === "ribu" || u === "k") n *= 1_000;
      return n;
    })
    .filter((n) => n >= 1000);
  if (!isIdr || nums.length === 0) return s.slice(0, 120);
  let [min, max] = [nums[0], nums[1] ?? nums[0]];
  if (yearly) {
    min /= 12;
    max /= 12;
  }
  if (max < 1_000_000) return s.slice(0, 120);
  const a = juta(min), b = juta(max);
  return `Rp ${a === b ? a : `${a}–${b}`} jt`;
}
