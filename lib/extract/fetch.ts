import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

/** IPv4/IPv6 privat, loopback, link-local, CGNAT, metadata cloud. */
export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return /^(fc|fd|fe8|fe9|fea|feb)/.test(v);
}

export class FetchBlocked extends Error {}

async function assertPublic(u: URL) {
  if (!/^https?:$/.test(u.protocol)) throw new FetchBlocked("protocol");
  if (u.port && !["80", "443", ""].includes(u.port)) throw new FetchBlocked("port");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FetchBlocked("host");
  }
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) throw new FetchBlocked("private");
}

/** Ambil HTML halaman lowongan. Redirect diikuti manual supaya tiap lompatan dicek ulang. */
export async function fetchHtml(url: string, signal: AbortSignal): Promise<{ html: string; finalUrl: string; status: number }> {
  let current = new URL(url);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(current);
    const res = await fetch(current, {
      signal,
      redirect: "manual",
      headers: {
        "user-agent": UA,
        "accept-language": "id-ID,id;q=0.9,en;q=0.8",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { html: "", finalUrl: current.toString(), status: res.status };
      current = new URL(loc, current);
      continue;
    }
    if (!res.ok) return { html: "", finalUrl: current.toString(), status: res.status };
    const type = res.headers.get("content-type") ?? "";
    if (type && !/html|xml/i.test(type)) return { html: "", finalUrl: current.toString(), status: 415 };
    return { html: await readCapped(res), finalUrl: current.toString(), status: res.status };
  }
  throw new FetchBlocked("redirects");
}

async function readCapped(res: Response) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_BYTES));
}
