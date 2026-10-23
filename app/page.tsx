"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AddJobModal } from "@/components/AddJobModal";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { JobTable } from "@/components/JobTable";
import { StatsBar } from "@/components/StatsBar";
import { Toast, type ToastData } from "@/components/Toast";
import { Toolbar, type SortKey, type StatusFilter } from "@/components/Toolbar";
import { exportCsv, exportJson, importJson } from "@/lib/export";
import type { Job } from "@/lib/types";
import { useJobs } from "@/lib/useJobs";

const PRIO_RANK = { high: 0, med: 1, low: 2 } as const;

export default function Home() {
  const { jobs, ready, add, update, setStatus, remove, restore, replaceAll } = useJobs();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [toast, setToast] = useState<ToastData | null>(null);

  const notify = (message: string, action?: ToastData["action"]) =>
    setToast({ id: Date.now(), message, action });

  const clearToast = useCallback(() => setToast(null), []);

  const openAdd = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  // Shortcut: N atau Ctrl/⌘+K untuk tambah loker
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key.toLowerCase() === "n" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        openAdd();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openAdd]);

  const counts = useMemo(() => {
    const c = { all: jobs.length } as Record<StatusFilter, number>;
    for (const j of jobs) c[j.status] = (c[j.status] ?? 0) + 1;
    return c;
  }, [jobs]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = jobs.filter(
      (j) =>
        (filter === "all" || j.status === filter) &&
        (!q || [j.company, j.title, j.location, j.platform, j.notes].join(" ").toLowerCase().includes(q))
    );
    return [...list].sort((a, b) => {
      switch (sort) {
        case "deadline":
          return (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
        case "company":
          return a.company.localeCompare(b.company, "id");
        case "priority":
          return PRIO_RANK[a.priority] - PRIO_RANK[b.priority] || b.addedAt.localeCompare(a.addedAt);
        default:
          return b.addedAt.localeCompare(a.addedAt);
      }
    });
  }, [jobs, query, filter, sort]);

  function handleSave(job: Job, isEdit: boolean) {
    if (isEdit) {
      update(job.id, job);
      notify("Perubahan disimpan");
    } else {
      add(job);
      setFilter("all");
      setSort("newest");
      notify(`${job.company} ditambahkan ✓`);
    }
    setModalOpen(false);
  }

  function handleDelete(job: Job) {
    const index = jobs.findIndex((j) => j.id === job.id);
    remove(job.id);
    notify(`${job.title} dihapus`, { label: "Batalkan", run: () => restore(job, index) });
  }

  async function handleImport(file: File) {
    try {
      const list = await importJson(file);
      if (!confirm(`Ganti data sekarang (${jobs.length}) dengan ${list.length} loker dari backup?`)) return;
      replaceAll(list);
      notify(`${list.length} loker dipulihkan`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Gagal import");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <Header
        onAdd={openAdd}
        onExportCsv={() => exportCsv(visible)}
        onExportJson={() => exportJson(jobs)}
        onImport={handleImport}
      />

      <StatsBar jobs={jobs} />

      <section className="flex flex-col gap-3">
        <Toolbar
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
          sort={sort}
          setSort={setSort}
          counts={counts}
        />

        {!ready ? (
          <div className="space-y-2 rounded-[var(--radius)] border border-line bg-surface p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shimmer h-12 rounded-lg" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState onAdd={openAdd} filtered={jobs.length > 0} />
        ) : (
          <JobTable
            jobs={visible}
            onStatus={setStatus}
            onEdit={(j) => {
              setEditing(j);
              setModalOpen(true);
            }}
            onDelete={handleDelete}
          />
        )}

        {ready && jobs.length > 0 && (
          <p className="text-center font-mono text-[11px] text-muted">
            Data tersimpan di browser ini · backup lewat menu ⋯
          </p>
        )}
      </section>

      <AddJobModal
        open={modalOpen}
        editing={editing}
        existingUrls={jobs.map((j) => j.url)}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <Toast toast={toast} onDone={clearToast} />
    </main>
  );
}
