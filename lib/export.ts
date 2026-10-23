import type { Job } from "./types";
import { STATUS_META, WORK_MODE_LABEL } from "./types";

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportCsv(jobs: Job[]) {
  const cols: [string, (j: Job) => string][] = [
    ["Ditambahkan", (j) => j.addedAt],
    ["Perusahaan", (j) => j.company],
    ["Posisi", (j) => j.title],
    ["Level", (j) => j.seniority],
    ["Status", (j) => STATUS_META[j.status].label],
    ["Prioritas", (j) => j.priority],
    ["Platform", (j) => j.platform],
    ["Lokasi", (j) => j.location],
    ["Mode", (j) => WORK_MODE_LABEL[j.workMode]],
    ["Tipe", (j) => j.employmentType],
    ["Gaji", (j) => j.salary],
    ["Diposting", (j) => j.postedAt ?? ""],
    ["Deadline", (j) => j.deadline ?? ""],
    ["Apply", (j) => j.appliedAt ?? ""],
    ["Link", (j) => j.url],
    ["Catatan", (j) => j.notes],
  ];
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [cols.map((c) => esc(c[0])).join(","), ...jobs.map((j) => cols.map((c) => esc(c[1](j))).join(","))];
  download(`lokerku-${stamp()}.csv`, "﻿" + rows.join("\n"), "text/csv;charset=utf-8");
}

export function exportJson(jobs: Job[]) {
  download(`lokerku-backup-${stamp()}.json`, JSON.stringify(jobs, null, 2), "application/json");
}

export async function importJson(file: File): Promise<Job[]> {
  const parsed = JSON.parse(await file.text());
  if (!Array.isArray(parsed)) throw new Error("Format backup tidak dikenali");
  return parsed.filter((j) => j && typeof j.id === "string" && typeof j.url === "string");
}
