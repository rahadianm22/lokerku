"use client";

import { useCountUp } from "@/hooks/use-count-up";
import { computeStats } from "@/lib/format";
import type { Job } from "@/lib/types";

function Stat({ label, value, sub, cls = "" }: { label: string; value: number; sub: string; cls?: string }) {
  const n = useCountUp(value);
  return (
    <div className={`stat ${cls}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value" aria-hidden="true">{n}</span>
      <span className="sr-only">{value}</span>
      <span className="stat-sub">{sub}</span>
    </div>
  );
}

export function StatsRow({ jobs, now }: { jobs: Job[]; now: number }) {
  const s = computeStats(jobs, now);
  return (
    <section className="stats" aria-label="Ringkasan">
      <Stat label="Total loker" value={s.total} sub="tersimpan di Lokerku" cls="stat-total" />
      <Stat label="Masuk 7 hari" value={s.week} sub={s.week ? "loker baru minggu ini" : "belum ada yang baru"} />
      <Stat label="Sudah apply" value={s.applied} sub={s.total ? `${s.appliedPct}% dari semua loker` : "belum ada"} />
      <Stat label="Interview" value={s.interview} sub={s.interview ? "sedang berjalan" : "belum ada jadwal"} />
      <Stat
        label="Deadline ≤ 3 hari"
        value={s.dueSoon}
        sub={s.dueSoon ? "segera kirim lamaran" : "aman untuk sekarang"}
        cls={s.dueSoon ? "stat-danger" : ""}
      />
    </section>
  );
}
