import Dexie, { type EntityTable } from "dexie";
import type { Job } from "./types";

export interface Meta {
  key: string;
  value: string | number | null;
}

export type LokerDb = Dexie & {
  jobs: EntityTable<Job, "id">;
  meta: EntityTable<Meta, "key">;
};

/** Satu database per akun ('guest' untuk mode tamu), supaya dua akun di satu browser tidak tercampur. */
export function openDb(ns: string): LokerDb {
  const db = new Dexie(`lokerku-${ns}`) as LokerDb;
  db.version(1).stores({
    jobs: "id, createdAt, status, deadline, company, updatedAt",
    meta: "key",
  });
  return db;
}

const cache = new Map<string, LokerDb>();
export function getDb(ns: string) {
  let db = cache.get(ns);
  if (!db) {
    db = openDb(ns);
    cache.set(ns, db);
  }
  return db;
}

export async function dropDb(ns: string) {
  const db = cache.get(ns) ?? openDb(ns);
  cache.delete(ns);
  db.close();
  await Dexie.delete(db.name);
}

export async function getMeta<T extends Meta["value"]>(db: LokerDb, key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export function setMeta(db: LokerDb, key: string, value: Meta["value"]) {
  return db.meta.put({ key, value });
}
