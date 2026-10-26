import type { Job } from "./types";

export const TOMBSTONE_TTL = 30 * 86_400_000;

const CONTENT_KEYS: (keyof Job)[] = [
  "url", "company", "title", "city", "platform", "mode", "type", "level", "salary",
  "postedAt", "deadline", "status", "priority", "notes", "logoUrl", "deletedAt",
];

export function sameContent(a: Job, b: Job) {
  return (
    CONTENT_KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null)) &&
    JSON.stringify(a.history ?? []) === JSON.stringify(b.history ?? [])
  );
}

/**
 * Gabungkan dua salinan per id, yang `updatedAt`-nya lebih baru menang.
 * Bila `updatedAt` sama tapi isinya beda, `base` (Sheet) menang dan diberi `updatedAt = now`,
 * supaya edit manual di Google Sheet ikut menyebar ke perangkat.
 */
export function mergeJobs(base: Job[], incoming: Job[], now = Date.now()) {
  const out = new Map<string, Job>();
  for (const j of base) out.set(j.id, j);
  for (const j of incoming) {
    const cur = out.get(j.id);
    if (!cur || j.updatedAt > cur.updatedAt) out.set(j.id, j);
    else if (j.updatedAt === cur.updatedAt && !sameContent(j, cur)) out.set(j.id, { ...cur, updatedAt: now });
  }
  return [...out.values()].filter((j) => !j.deletedAt || now - j.deletedAt < TOMBSTONE_TTL);
}

/** Apakah dua daftar berbeda isi (abaikan urutan). */
export function differs(a: Job[], b: Job[]) {
  if (a.length !== b.length) return true;
  const m = new Map(a.map((j) => [j.id, j]));
  return b.some((j) => {
    const o = m.get(j.id);
    return !o || o.updatedAt !== j.updatedAt || o.createdAt !== j.createdAt || !sameContent(o, j);
  });
}
