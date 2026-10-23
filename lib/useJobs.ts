"use client";

import { useCallback, useEffect, useState } from "react";
import type { Job, JobStatus } from "./types";

const KEY = "lokerku.jobs.v1";

function load(): Job[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Job[]) : [];
  } catch {
    return [];
  }
}

function persist(jobs: Job[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(jobs));
  } catch {
    /* storage penuh / private mode */
  }
}

/**
 * Penyimpanan lokal (localStorage). Cocok untuk pemakaian pribadi.
 * Mau sync antar device? Ganti isi hook ini dengan Supabase / Turso —
 * komponen lain tidak perlu diubah.
 */
export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setJobs(load());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setJobs(load());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((fn: (prev: Job[]) => Job[]) => {
    setJobs((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, []);

  const add = useCallback((job: Job) => commit((p) => [job, ...p]), [commit]);

  const update = useCallback(
    (id: string, patch: Partial<Job>) =>
      commit((p) =>
        p.map((j) => {
          if (j.id !== id) return j;
          const next = { ...j, ...patch, updatedAt: new Date().toISOString() };
          if (patch.status === "applied" && !j.appliedAt) next.appliedAt = next.updatedAt;
          return next;
        })
      ),
    [commit]
  );

  const setStatus = useCallback(
    (id: string, status: JobStatus) => update(id, { status }),
    [update]
  );

  const remove = useCallback((id: string) => commit((p) => p.filter((j) => j.id !== id)), [commit]);

  const restore = useCallback(
    (job: Job, index: number) =>
      commit((p) => {
        const next = [...p];
        next.splice(Math.min(index, next.length), 0, job);
        return next;
      }),
    [commit]
  );

  const replaceAll = useCallback((list: Job[]) => commit(() => list), [commit]);

  return { jobs, ready, add, update, setStatus, remove, restore, replaceAll };
}
