import { toHttpUrl } from "./url";

export interface SharedJob {
  /** Link lowongan yang dibagikan, kalau ada. */
  url?: string;
  /** Teks yang ikut dibagikan (judul, caption), tanpa link-nya. */
  text?: string;
}

/**
 * Baca parameter dari menu "Bagikan" Android (Web Share Target).
 * Banyak aplikasi menaruh link di `text` ("Lihat lowongan ini: https://…"), bukan di `url`.
 */
export function parseShared(url?: string | null, text?: string | null, title?: string | null): SharedJob | null {
  const direct = url ? toHttpUrl(url) : "";
  const inText = !direct && text ? (/https?:\/\/[^\s<>"']+/i.exec(text)?.[0] ?? "") : "";
  const link = direct || (inText ? toHttpUrl(inText.replace(/[).,!?»"']+$/, "")) : "");
  const body = [title, text]
    .filter((s): s is string => !!s && !!s.trim())
    // Buang link apa adanya (termasuk tanda baca yang menempel, mis. "…/987."), lalu link lain yang tersisa.
    .map((s) => (inText ? s.split(inText).join("") : s).replace(/https?:\/\/\S+/g, "").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 5000);
  if (!link && !body) return null;
  return { ...(link ? { url: link } : {}), ...(body ? { text: body } : {}) };
}
