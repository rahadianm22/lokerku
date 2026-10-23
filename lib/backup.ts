import { backupSchema } from "./schema";
import type { Job } from "./types";

export function toBackup(jobs: Job[], now = Date.now()) {
  return JSON.stringify({ app: "lokerku", version: 1, exportedAt: new Date(now).toISOString(), jobs }, null, 2);
}

/** Kembalikan daftar loker, atau null bila file bukan backup Lokerku yang valid. */
export function parseBackup(text: string): Job[] | null {
  try {
    const r = backupSchema.safeParse(JSON.parse(text));
    return r.success ? r.data.jobs.filter((j) => !j.deletedAt) : null;
  } catch {
    return null;
  }
}

export function download(name: string, content: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
