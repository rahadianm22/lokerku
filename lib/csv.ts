import { isoWib } from "./format";
import { PRIORITY_LABEL, STATUS_LABEL, type Job } from "./types";

const COLUMNS: [string, (j: Job) => string][] = [
  ["Perusahaan", (j) => j.company],
  ["Posisi", (j) => j.title],
  ["Status", (j) => STATUS_LABEL[j.status]],
  ["Lokasi", (j) => j.city],
  ["Mode", (j) => j.mode],
  ["Tipe", (j) => j.type],
  ["Level", (j) => j.level],
  ["Platform", (j) => j.platform],
  ["Gaji", (j) => j.salary],
  ["Diposting", (j) => j.postedAt ?? ""],
  ["Deadline", (j) => j.deadline ?? ""],
  ["Prioritas", (j) => PRIORITY_LABEL[j.priority]],
  ["Link", (j) => j.url],
  ["Catatan", (j) => j.notes],
  ["Dikirim", (j) => isoWib(j.createdAt)],
];

/** Escape CSV, plus cegah formula injection di Excel/Sheets (sel yang diawali = + - @). */
export function csvCell(v: string) {
  let s = v ?? "";
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(jobs: Job[]) {
  const lines = [COLUMNS.map((c) => c[0]).join(","), ...jobs.map((j) => COLUMNS.map((c) => csvCell(c[1](j))).join(","))];
  return "﻿" + lines.join("\r\n");
}
