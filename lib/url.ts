const TRACKING = /^(utm_|fbclid$|gclid$|mc_|ref$|refid$|trk|trackingid$|src$|source$|lipi$|from$)/i;

/** Lengkapi protokol dan validasi. Kembalikan '' bila bukan link http(s) yang masuk akal. */
export function toHttpUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  const withProto = /^https?:\/\//i.test(v) ? v : /^[a-z][\w+.-]*:/i.test(v) ? "" : `https://${v}`;
  if (!withProto) return "";
  try {
    const u = new URL(withProto);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return "";
    return u.toString();
  } catch {
    return "";
  }
}

/** Kunci pembanding duplikat: tanpa query tracking, hash, www, dan garis miring akhir. */
export function normalizeUrl(raw: string): string {
  const s = toHttpUrl(raw);
  if (!s) return "";
  const u = new URL(s);
  u.hash = "";
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
  u.searchParams.sort();
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const path = u.pathname.replace(/\/+$/, "");
  const q = u.searchParams.toString();
  return `${host}${path}${q ? `?${q}` : ""}`;
}

/** Hanya izinkan http(s) untuk href/src. Data bisa datang dari Sheet yang diedit manual. */
export function safeHref(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function shortUrl(raw: string) {
  return raw.replace(/^https?:\/\/(www\.)?/i, "");
}
