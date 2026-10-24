"use client";

import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { fmtDateShort, fmtRelative, fmtSentShort } from "@/lib/format";
import type { Job } from "@/lib/types";
import { CompanyAvatar } from "./company-avatar";
import { DeadlineBadge } from "./deadline-badge";
import { JobMeta, OpenLink, PriorityFlag, ROW_ENTER, ROW_EXIT, type RowHandlers } from "./job-table";
import { StatusSelect } from "./status-chip";

export function JobCardList({ jobs, now, flashId, ...h }: { jobs: Job[]; now: number; flashId: string | null } & RowHandlers) {
  return (
    <div className="mob">
      <AnimatePresence initial={false}>
        {jobs.map((j) => (
          <motion.article
            key={j.id}
            layout="position"
            className={`mcard${j.id === flashId ? " row-new" : ""}`}
            {...(j.id === flashId ? ROW_ENTER : { initial: false })}
            exit={ROW_EXIT}
            aria-label={`${j.title}, ${j.company}`}
          >
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
            <div className="mc-row">
              <StatusSelect status={j.status} title={j.title} onChange={(s) => h.onStatus(j, s)} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {fmtDateShort(j.deadline) || "Tanpa deadline"}
                </span>
                <DeadlineBadge deadline={j.deadline} status={j.status} now={now} />
              </div>
            </div>
            <dl className="mc-meta">
              <div>
                <dt>Lokasi</dt>
                <dd className={j.city ? undefined : "empty-val"}>{j.city || "Belum diisi"}</dd>
                <dd style={{ color: "var(--muted)", margin: 0 }}>{j.mode}</dd>
              </div>
              <div>
                <dt>Gaji</dt>
                <dd className={`mono${j.salary ? "" : " empty-val"}`}>{j.salary || "Tidak dicantumkan"}</dd>
              </div>
              <div>
                <dt>Dikirim</dt>
                <dd>{fmtRelative(j.createdAt, now)}</dd>
                <dd className="mono" style={{ color: "var(--muted)", margin: 0, fontSize: 11 }}>
                  {fmtSentShort(j.createdAt)}
                </dd>
              </div>
            </dl>
            <div className="mc-actions">
              <OpenLink job={j} className="btn btn-ghost btn-sm">
                <ExternalLink className="ic" strokeWidth={1.75} aria-hidden />
                Buka link
              </OpenLink>
              <button type="button" className="icon-btn" onClick={() => h.onEdit(j)} aria-label="Edit loker">
                <Pencil className="ic" strokeWidth={1.75} aria-hidden />
              </button>
              <button type="button" className="icon-btn" onClick={() => h.onDelete(j)} aria-label="Hapus loker" style={{ color: "var(--danger)" }}>
                <Trash2 className="ic" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  );
}
