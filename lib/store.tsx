"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { signOut, useSession } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { dropDb, getDb, getMeta, setMeta, type LokerDb } from "./db";
import { fromLegacy, LEGACY_KEY } from "./legacy";
import { TOMBSTONE_TTL } from "./merge";
import { SEED } from "./seed";
import type { Job } from "./types";

export type SyncState =
  | { kind: "guest" }
  | { kind: "idle" | "syncing"; lastSyncAt?: number }
  | { kind: "synced"; lastSyncAt: number }
  | { kind: "offline"; lastSyncAt?: number }
  | { kind: "error"; error: "auth" | "scope" | "rate" | "google" | "network"; lastSyncAt?: number };

export interface Account {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface Store {
  ready: boolean;
  jobs: Job[];
  account: Account | null;
  authEnabled: boolean;
  authLoading: boolean;
  sync: SyncState;
  sheetUrl: string | null;
  syncNow: () => void;
  add: (job: Job) => Promise<void>;
  update: (id: string, patch: Partial<Job>) => Promise<void>;
  remove: (id: string) => Promise<Job | undefined>;
  revive: (job: Job) => Promise<void>;
  replaceAll: (list: Job[]) => Promise<Job[]>;
  logout: () => Promise<void>;
  notice: string | null;
  clearNotice: () => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore di luar <StoreProvider>");
  return s;
}

/** updatedAt harus selalu naik, walau dua perubahan terjadi di milidetik yang sama. */
const bump = (prev?: number) => Math.max(Date.now(), (prev ?? 0) + 1);

async function prepareDb(db: LokerDb, ns: string) {
  // Data dari versi lama (localStorage) dipindah sekali ke IndexedDB.
  if (!(await getMeta(db, "legacyImported"))) {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      const list = raw ? fromLegacy(JSON.parse(raw)) : [];
      if (list.length) await db.jobs.bulkPut(list);
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* localStorage tidak tersedia: lewati */
    }
    await setMeta(db, "legacyImported", 1);
  }
  if (process.env.NODE_ENV === "development" && ns === "guest" && !(await getMeta(db, "seeded"))) {
    if ((await db.jobs.count()) === 0) await db.jobs.bulkPut(SEED);
    await setMeta(db, "seeded", 1);
  }
  // Bersihkan tombstone lama.
  const cutoff = Date.now() - TOMBSTONE_TTL;
  await db.jobs.filter((j) => !!j.deletedAt && j.deletedAt < cutoff).delete();
}

/** Pindahkan loker dari mode tamu ke akun yang baru masuk. Data contoh dev tidak ikut. */
async function migrateGuest(to: LokerDb) {
  const guest = getDb("guest");
  const list = (await guest.jobs.toArray()).filter((j) => !j.deletedAt && !j.id.startsWith("seed-"));
  let moved = 0;
  for (const j of list) {
    if (!(await to.jobs.get(j.id))) {
      await to.jobs.put({ ...j, updatedAt: bump(j.updatedAt) });
      moved++;
    }
  }
  await dropDb("guest");
  return moved;
}

export function StoreProvider({ authEnabled, children }: { authEnabled: boolean; children: React.ReactNode }) {
  const session = useSession();
  const authLoading = authEnabled && session.status === "loading";
  const user = authEnabled && session.status === "authenticated" ? session.data.user : null;
  const ns = authLoading ? null : user?.id ? `u-${user.id}` : "guest";
  const db = useMemo(() => (ns ? getDb(ns) : null), [ns]);

  const [prepared, setPrepared] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncState>({ kind: "guest" });
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !ns) return;
    let alive = true;
    (async () => {
      await prepareDb(db, ns);
      if (ns !== "guest") {
        const moved = await migrateGuest(db);
        if (moved && alive) setNotice(`${moved} loker dari mode tamu dipindah ke akunmu`);
        setSheetUrl(((await getMeta<string>(db, "sheetUrl")) ?? null) || null);
        const last = await getMeta<number>(db, "lastSyncAt");
        setSync({ kind: "idle", lastSyncAt: last ?? undefined });
      } else {
        setSync({ kind: "guest" });
        setSheetUrl(null);
      }
      if (alive) setPrepared(ns);
    })();
    return () => {
      alive = false;
    };
  }, [db, ns]);

  const ready = !!ns && prepared === ns;
  const jobs = useLiveQuery(
    async () => (db && ready ? (await db.jobs.toArray()).filter((j) => !j.deletedAt) : []),
    [db, ready],
    [] as Job[],
  );

  /* ---------- sinkron ---------- */
  const running = useRef(false);
  const again = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastAt = useRef(0);

  const runSync = useCallback(async () => {
    if (!db || !ns || ns === "guest" || !ready) return;
    if (session.data?.driveGranted === false) {
      setSync({ kind: "error", error: "scope" });
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSync((s) => ({ kind: "offline", lastSyncAt: "lastSyncAt" in s ? s.lastSyncAt : undefined }));
      return;
    }
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setSync((s) => ({ kind: "syncing", lastSyncAt: "lastSyncAt" in s ? s.lastSyncAt : undefined }));
    try {
      const all = await db.jobs.toArray();
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spreadsheetId: (await getMeta<string>(db, "sheetId")) ?? null, jobs: all }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "google" }));
        setSync((s) => ({ kind: "error", error: error ?? "google", lastSyncAt: "lastSyncAt" in s ? s.lastSyncAt : undefined }));
        return;
      }
      const data: { spreadsheetId: string; spreadsheetUrl: string; jobs: Job[]; syncedAt: number } = await res.json();
      const serverIds = new Set(data.jobs.map((j) => j.id));
      await db.transaction("rw", db.jobs, db.meta, async () => {
        for (const j of data.jobs) {
          const local = await db.jobs.get(j.id);
          // Perubahan lokal yang terjadi selama request tetap dipertahankan.
          if (!local || local.updatedAt < j.updatedAt) await db.jobs.put(j);
        }
        // Tombstone yang sudah dibuang server tidak perlu disimpan lagi.
        await db.jobs.filter((j) => !!j.deletedAt && !serverIds.has(j.id) && j.updatedAt <= data.syncedAt).delete();
        await setMeta(db, "sheetId", data.spreadsheetId);
        await setMeta(db, "sheetUrl", data.spreadsheetUrl);
        await setMeta(db, "lastSyncAt", data.syncedAt);
      });
      lastAt.current = Date.now();
      setSheetUrl(data.spreadsheetUrl);
      setSync({ kind: "synced", lastSyncAt: data.syncedAt });
    } catch {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setSync((s) => {
        const lastSyncAt = "lastSyncAt" in s ? s.lastSyncAt : undefined;
        return offline ? { kind: "offline", lastSyncAt } : { kind: "error", error: "network", lastSyncAt };
      });
    } finally {
      running.current = false;
      if (again.current) {
        again.current = false;
        timer.current = setTimeout(runSync, 300);
      }
    }
  }, [db, ns, ready, session.data?.driveGranted]);

  const schedule = useCallback(
    (delay = 1200) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(runSync, delay);
    },
    [runSync],
  );

  useEffect(() => {
    if (!ready || ns === "guest") return;
    schedule(0);
    const onFocus = () => Date.now() - lastAt.current > 30_000 && schedule(0);
    const onOnline = () => schedule(0);
    const tick = setInterval(() => document.visibilityState === "visible" && schedule(0), 120_000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(timer.current);
      clearInterval(tick);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [ready, ns, schedule]);

  const changed = useCallback(() => {
    if (ns && ns !== "guest") schedule();
  }, [ns, schedule]);

  /* ---------- CRUD ---------- */
  const add = useCallback(
    async (job: Job) => {
      if (!db) return;
      await db.jobs.put({ ...job, deletedAt: null });
      changed();
    },
    [db, changed],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Job>) => {
      if (!db) return;
      const cur = await db.jobs.get(id);
      if (!cur) return;
      await db.jobs.put({ ...cur, ...patch, id, updatedAt: bump(cur.updatedAt) });
      changed();
    },
    [db, changed],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!db) return;
      const cur = await db.jobs.get(id);
      if (!cur) return;
      const now = bump(cur.updatedAt);
      await db.jobs.put({ ...cur, deletedAt: now, updatedAt: now });
      changed();
      return cur;
    },
    [db, changed],
  );

  const revive = useCallback(
    async (job: Job) => {
      if (!db) return;
      const cur = await db.jobs.get(job.id);
      await db.jobs.put({ ...job, deletedAt: null, updatedAt: bump(cur?.updatedAt ?? job.updatedAt) });
      changed();
    },
    [db, changed],
  );

  /** Ganti semua loker dengan `list`. Mengembalikan daftar sebelumnya untuk "Batalkan". */
  const replaceAll = useCallback(
    async (list: Job[]) => {
      if (!db) return [];
      const before = (await db.jobs.toArray()).filter((j) => !j.deletedAt);
      const keep = new Set(list.map((j) => j.id));
      await db.transaction("rw", db.jobs, async () => {
        for (const j of before) {
          if (!keep.has(j.id)) {
            const t = bump(j.updatedAt);
            await db.jobs.put({ ...j, deletedAt: t, updatedAt: t });
          }
        }
        for (const j of list) {
          const cur = await db.jobs.get(j.id);
          await db.jobs.put({ ...j, deletedAt: null, updatedAt: bump(Math.max(cur?.updatedAt ?? 0, j.updatedAt)) });
        }
      });
      changed();
      return before;
    },
    [db, changed],
  );

  const logout = useCallback(async () => {
    // Salinan lokal akun dihapus supaya orang lain di perangkat ini tidak melihatnya. Data tetap aman di Sheet.
    if (ns && ns !== "guest") await dropDb(ns);
    await signOut({ callbackUrl: "/" });
  }, [ns]);

  const value: Store = {
    ready,
    jobs,
    account: user ? { id: user.id, name: user.name, email: user.email } : null,
    authEnabled,
    authLoading,
    sync,
    sheetUrl,
    syncNow: () => schedule(0),
    add,
    update,
    remove,
    revive,
    replaceAll,
    logout,
    notice,
    clearNotice: () => setNotice(null),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
