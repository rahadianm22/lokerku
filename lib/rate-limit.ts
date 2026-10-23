/**
 * Rate limit sederhana per instance server (memori). Di Vercel tiap instance punya hitungan sendiri,
 * jadi ini rem darurat, bukan batas yang presisi.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()) {
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.delete(hits.keys().next().value!);
  return true;
}
