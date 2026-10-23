"use client";

import { ExternalLink, Flag, Pencil, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { fmtDate, fmtPosted, fmtRelative, fmtSent } from "@/lib/format";
import type { Job, Status } from "@/lib/types";
import { safeHref } from "@/lib/url";
import { CompanyAvatar } from "./company-avatar";
import { DeadlineBadge } from "./deadline-badge";
import { StatusChip } from "./status-chip";

export interface RowHandlers {
  onStatus: (job: Job, s: Status) => void;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
}

export const ROW_ENTER = { initial: { opacity: 0, y: -16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.38, ease: [0.2, 0.8, 0.2, 1] as const } };
export const ROW_EXIT = { opacity: 0, x: 56, transition: { duration: 0.28, ease: [0.5, 0, 0.75, 0] as const } };

export function PriorityFlag() {
  return (
    <span className="flag" title="Prioritas tinggi">
      <Flag className="ic" width={13} height={13} fill="currentColor" strokeWidth={1.75} role="img" aria-label="Prioritas tinggi" />
    </span>
  );
}

export function JobMeta({ job }: { job: Job }) {
  return (
    <div className="meta">
      <span>{job.company}</span>
      <span aria-hidden="true">·</span>
      <span className="tag">{job.platform}</span>
      <span aria-hidden="true">·</span>
      <span>{job.level}</span>
    </div>
  );
}

export function OpenLink({ job, className, children }: { job: Job; className: string; children: React.ReactNode }) {
  const href = safeHref(job.url);
  if (!href) {
    return (
      <span className={className} aria-disabled="true" title="Link belum diisi">
        {children}
      </span>
    );
  }
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer" aria-label="Buka link lowongan" title="Buka link">
      {children}
    </a>
  );
}

export function JobTable({ jobs, now, flashId, ...h }: { jobs: Job[]; now: number; flashId: string | null } & RowHandlers) {
  return (
    <div className="desk tbl-scroll">
      <table className="tbl">
        <colgroup>
          <col style={{ width: "28%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: 120 }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Perusahaan &amp; posisi</th>
            <th scope="col">Status</th>
            <th scope="col">Lokasi</th>
            <th scope="col">Gaji</th>
            <th scope="col">Dikirim</th>
            <th scope="col">Deadline</th>
            <th scope="col">
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {jobs.map((j) => (
              <motion.tr
                key={j.id}
                layout="position"
                className={j.id === flashId ? "row-new" : undefined}
                {...(j.id === flashId ? ROW_ENTER : { initial: false })}
                exit={ROW_EXIT}
              >
                <td>
                  <div className="co">
                    <CompanyAvatar name={j.company} logoUrl={j.logoUrl} />
                    <div className="co-text">
                      <div className="jt">
                        <span>{j.title}</span>
                        {j.priority === "high" && <PriorityFlag />}
                      </div>
                      <JobMeta job={j} />
                    </div>
                  </div>
                </td>
                <td>
                  <StatusChip status={j.status} title={j.title} onChange={(s) => h.onStatus(j, s)} />
                </td>
                <td>
                  <div className={`cell-1${j.city ? "" : " empty-val"}`}>{j.city || "Belum diisi"}</div>
                  <div className="cell-2">
                    {j.mode} · {j.type}
                  </div>
                </td>
                <td>
                  <div className={`cell-1 mono${j.salary ? "" : " empty-val"}`}>{j.salary || "Tidak dicantumkan"}</div>
                </td>
                <td>
                  <div className="cell-1 mono" style={{ fontSize: 12.5 }}>
                    {fmtSent(j.createdAt)}
                  </div>
                  <div className="cell-2">{fmtRelative(j.createdAt, now)}</div>
                  <div className="cell-3">{fmtPosted(j.postedAt)}</div>
                </td>
                <td>
                  <div className="dl">
                    <span className={`mono${j.deadline ? "" : " empty-val"}`} style={{ fontSize: 12.5 }}>
                      {fmtDate(j.deadline) || "Tanpa deadline"}
                    </span>
                    <DeadlineBadge deadline={j.deadline} status={j.status} now={now} />
                  </div>
                </td>
                <td>
                  <div className="acts">
                    <OpenLink job={j} className="act">
                      <ExternalLink className="ic" strokeWidth={1.75} aria-hidden />
                    </OpenLink>
                    <button type="button" className="act" onClick={() => h.onEdit(j)} aria-label="Edit loker" title="Edit">
                      <Pencil className="ic" strokeWidth={1.75} aria-hidden />
                    </button>
                    <button type="button" className="act del" onClick={() => h.onDelete(j)} aria-label="Hapus loker" title="Hapus">
                      <Trash2 className="ic" strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
