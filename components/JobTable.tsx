"use client";

import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, Flag, MapPin, Pencil, Trash2 } from "lucide-react";
import type { Job, JobStatus } from "@/lib/types";
import { STATUS_META, WORK_MODE_LABEL } from "@/lib/types";
import { daysLeft, fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";
import { CompanyAvatar } from "./CompanyAvatar";

const PRIO_COLOR = { low: "text-muted/40", med: "text-warn", high: "text-danger" } as const;

export function JobTable({
  jobs,
  onStatus,
  onEdit,
  onDelete,
}: {
  jobs: Job[];
  onStatus: (id: string, s: JobStatus) => void;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
}) {
  return (
    <>
    {/* Mobile: kartu */}
    <ul className="flex flex-col gap-2 md:hidden">
      <AnimatePresence initial={false}>
        {jobs.map((j) => (
          <MobileCard key={j.id} job={j} onStatus={onStatus} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </AnimatePresence>
    </ul>

    {/* Desktop: tabel */}
    <div className="scrollbar-thin hidden overflow-x-auto rounded-[var(--radius)] border border-line bg-surface md:block">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted uppercase">
            <th className="sticky left-0 z-10 bg-surface py-3 pr-3 pl-4 font-medium">Perusahaan & posisi</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Lokasi</th>
            <th className="px-3 py-3 font-medium">Gaji</th>
            <th className="px-3 py-3 font-medium">Dikirim</th>
            <th className="px-3 py-3 font-medium">Deadline</th>
            <th className="py-3 pr-4 pl-3 text-right font-medium">
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {jobs.map((j, i) => (
              <Row key={j.id} job={j} index={i} onStatus={onStatus} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
    </>
  );
}

function StatusSelect({ job: j, onStatus }: { job: Job; onStatus: (id: string, s: JobStatus) => void }) {
  return (
    <label className={`chip ${STATUS_META[j.status].chip} relative inline-flex cursor-pointer items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2 text-xs font-medium whitespace-nowrap`}>
      <span className="size-1.5 rounded-full bg-[var(--c)]" />
      <motion.span key={j.status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
        {STATUS_META[j.status].label}
      </motion.span>
      <select
        aria-label="Ubah status"
        value={j.status}
        onChange={(e) => onStatus(j.id, e.target.value as JobStatus)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {Object.entries(STATUS_META).map(([k, m]) => (
          <option key={k} value={k}>{m.label}</option>
        ))}
      </select>
    </label>
  );
}

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  const left = daysLeft(deadline);
  if (!deadline) return <span className="text-muted">—</span>;
  const urgent = left !== null && left >= 0 && left <= 3;
  const expired = left !== null && left < 0;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs whitespace-nowrap ${
        expired ? "text-muted line-through" : urgent ? "bg-danger/10 font-semibold text-danger" : "text-ink-2"
      }`}
    >
      {fmtDate(deadline)}
      {urgent && <span className="ml-1.5 font-sans">({left === 0 ? "hari ini" : `${left} hari`})</span>}
    </span>
  );
}

function MobileCard({
  job: j,
  onStatus,
  onEdit,
  onDelete,
}: {
  job: Job;
  onStatus: (id: string, s: JobStatus) => void;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
}) {
  const isNew = Date.now() - new Date(j.addedAt).getTime() < 10_000;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className={`rounded-[var(--radius)] border border-line bg-surface p-3.5 ${isNew ? "row-flash" : ""}`}
    >
      <button onClick={() => onEdit(j)} className="flex w-full items-start gap-3 text-left">
        <CompanyAvatar name={j.company} logo={j.logo} size={40} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{j.title}</span>
            {j.priority !== "low" && <Flag size={12} className={`shrink-0 fill-current ${PRIO_COLOR[j.priority]}`} />}
          </span>
          <span className="block truncate text-xs text-muted">
            {j.company} · {j.platform}
          </span>
          <span className="mt-1 block truncate text-xs text-ink-2">
            {[j.location, WORK_MODE_LABEL[j.workMode] !== "—" ? WORK_MODE_LABEL[j.workMode] : "", j.salary]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <StatusSelect job={j} onStatus={onStatus} />
        <span className="font-mono text-[11px] text-muted">{fmtDateTime(j.addedAt)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
          <DeadlineBadge deadline={j.deadline} />
          <div className="flex gap-0.5">
            <IconBtn label="Buka lowongan" href={j.url}><ExternalLink size={15} /></IconBtn>
            <IconBtn label="Hapus" onClick={() => onDelete(j)} danger><Trash2 size={15} /></IconBtn>
          </div>
        </div>
    </motion.li>
  );
}

function Row({
  job: j,
  index,
  onStatus,
  onEdit,
  onDelete,
}: {
  job: Job;
  index: number;
  onStatus: (id: string, s: JobStatus) => void;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
}) {
  const isNew = Date.now() - new Date(j.addedAt).getTime() < 10_000;

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          opacity: { delay: Math.min(index * 0.02, 0.2) },
          layout: { type: "spring", stiffness: 400, damping: 36 },
        },
      }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
      className={`group border-b border-line last:border-0 hover:bg-surface-2 ${isNew ? "row-flash" : ""}`}
    >
      {/* perusahaan & posisi */}
      <td className="sticky left-0 z-10 bg-surface py-3 pr-3 pl-4 group-hover:bg-surface-2 [.row-flash_&]:bg-transparent">
        <button onClick={() => onEdit(j)} className="flex max-w-[340px] items-center gap-3 text-left">
          <CompanyAvatar name={j.company} logo={j.logo} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-semibold">{j.title}</span>
              {j.priority !== "low" && <Flag size={12} className={`shrink-0 fill-current ${PRIO_COLOR[j.priority]}`} />}
            </span>
            <span className="flex items-center gap-1.5 truncate text-xs text-muted">
              {j.company}
              <span className="opacity-40">•</span>
              <span className="rounded bg-surface-2 px-1.5 py-px text-[10px] font-medium text-ink-2">{j.platform}</span>
              {j.seniority && <span className="text-[10px]">{j.seniority}</span>}
            </span>
          </span>
        </button>
      </td>

      {/* status */}
      <td className="px-3 py-3">
        <StatusSelect job={j} onStatus={onStatus} />
      </td>

      {/* lokasi */}
      <td className="px-3 py-3">
        <div className="flex max-w-[200px] items-center gap-1 truncate text-ink-2">
          <MapPin size={12} className="shrink-0 text-muted" />
          <span className="truncate">{j.location || "—"}</span>
        </div>
        <div className="mt-0.5 text-xs text-muted">
          {[WORK_MODE_LABEL[j.workMode] !== "—" ? WORK_MODE_LABEL[j.workMode] : "", j.employmentType]
            .filter(Boolean)
            .join(" · ") || "—"}
        </div>
      </td>

      {/* gaji */}
      <td className="px-3 py-3 font-mono text-xs whitespace-nowrap text-ink-2">{j.salary || <span className="text-muted">—</span>}</td>

      {/* dikirim */}
      <td className="px-3 py-3 whitespace-nowrap" title={new Date(j.addedAt).toLocaleString("id-ID")}>
        <div className="font-mono text-xs">{fmtDateTime(j.addedAt)}</div>
        <div className="text-[11px] text-muted">
          {fmtRelative(j.addedAt)}
          {j.postedAt && <> · posting {fmtDate(j.postedAt)}</>}
        </div>
      </td>

      {/* deadline */}
      <td className="px-3 py-3">
        <DeadlineBadge deadline={j.deadline} />
      </td>

      {/* aksi */}
      <td className="py-3 pr-4 pl-3">
        <div className="flex justify-end gap-0.5 opacity-60 transition group-hover:opacity-100">
          <IconBtn label="Buka lowongan" href={j.url}>
            <ExternalLink size={15} />
          </IconBtn>
          <IconBtn label="Edit" onClick={() => onEdit(j)}>
            <Pencil size={15} />
          </IconBtn>
          <IconBtn label="Hapus" onClick={() => onDelete(j)} danger>
            <Trash2 size={15} />
          </IconBtn>
        </div>
      </td>
    </motion.tr>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  href,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const cls = `grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface ${
    danger ? "hover:text-danger" : "hover:text-ink"
  }`;
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className={cls}>
      {children}
    </a>
  ) : (
    <button onClick={onClick} aria-label={label} title={label} className={cls}>
      {children}
    </button>
  );
}
