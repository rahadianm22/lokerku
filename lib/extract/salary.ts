import { clean } from "./util";

const fmtJuta = (n: number) => {
  const v = Math.round((n / 1_000_000) * 10) / 10;
  return Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
};

const fmtThousands = (n: number) => Math.round(n).toLocaleString("id-ID");

const UNIT_LABEL: Record<string, string> = { HOUR: "jam", DAY: "hari", WEEK: "minggu" };

/**
 * schema.org MonetaryAmount → teks gaji.
 * IDR: 'Rp 25–32 jt' (bulanan; tahunan dikonversi). Mata uang lain apa adanya: 'USD 2.000–3.000'.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatSalary(bs: any): string {
  if (!bs || typeof bs !== "object") return "";
  const currency = clean(bs.currency).toUpperCase() || "IDR";
  const v = bs.value && typeof bs.value === "object" ? bs.value : { value: bs.value };
  const unit = clean(v.unitText ?? bs.unitText).toUpperCase();
  let min = Number(v.minValue ?? v.value);
  let max = Number(v.maxValue ?? v.value);
  if (!Number.isFinite(min) || min <= 0) min = NaN;
  if (!Number.isFinite(max) || max <= 0) max = NaN;
  if (Number.isNaN(min) && Number.isNaN(max)) return "";
  if (Number.isNaN(min)) min = max;
  if (Number.isNaN(max)) max = min;
  if (unit === "YEAR") {
    min /= 12;
    max /= 12;
  }
  const suffix = UNIT_LABEL[unit] ? ` / ${UNIT_LABEL[unit]}` : "";

  if (currency === "IDR") {
    if (max >= 1_000_000) {
      const a = fmtJuta(min), b = fmtJuta(max);
      return `Rp ${a === b ? a : `${a}–${b}`} jt${suffix}`;
    }
    const a = fmtThousands(min), b = fmtThousands(max);
    return `Rp ${a === b ? a : `${a}–${b}`}${suffix}`;
  }
  const a = fmtThousands(min), b = fmtThousands(max);
  return `${currency} ${a === b ? a : `${a}–${b}`}${suffix}`;
}
