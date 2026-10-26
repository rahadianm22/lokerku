"use client";

import { ChevronDown, ImageIcon, Info } from "lucide-react";
import { motion } from "motion/react";
import { useRef } from "react";
import { CompanyAvatar } from "../company-avatar";
import {
  JOB_TYPES, LEVELS, MODES, PLATFORMS, PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL,
  type Confidence, type Draft, type ExtractResult, type MissingField, type StatusEvent,
} from "@/lib/types";
import { fmtSent } from "@/lib/format";
import { ConfidenceBanner } from "./confidence-banner";
import { ImageChip, type Shot } from "./image-chip";
import { Segmented } from "./segmented";

const fieldAnim = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.36, ease: [0.2, 0.8, 0.2, 1] as const, delay: 0.06 + i * 0.03 },
});

function Select<T extends string>({ id, value, options, onChange, labels }: {
  id: string; value: T; options: readonly T[]; onChange: (v: T) => void; labels?: Record<T, string>;
}) {
  return (
    <div className="sel-wrap full">
      <select id={id} className="inp" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels ? labels[o] : o}
          </option>
        ))}
      </select>
      <ChevronDown className="ic" strokeWidth={1.75} aria-hidden />
    </div>
  );
}

function MissingHint({ id }: { id: string }) {
  return (
    <span className="hint" id={id}>
      <Info className="ic" strokeWidth={1.75} aria-hidden />
      Tidak ditemukan di halaman
    </span>
  );
}

export function StepReview({
  draft,
  set,
  confidence,
  missing,
  editing,
  showUrl,
  note,
  httpStatus,
  paste,
  history,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  confidence: Confidence | null;
  missing: MissingField[];
  editing: boolean;
  /** Field link tampil saat edit, atau saat isi manual tanpa link. */
  showUrl: boolean;
  /** Alasan hasil gagal (login/diblokir) dan kode HTTP-nya, untuk pesan di banner. */
  note?: ExtractResult["note"];
  httpStatus?: number;
  /** Isi kolom kosong dari teks yang ditempel; mengembalikan label kolom yang terisi. */
  paste: PasteBox;
  /** Riwayat status loker yang sedang diedit. */
  history?: StatusEvent[];
}) {
  const miss = (k: MissingField) => missing.includes(k) && !String(draft[k] ?? "").trim();
  const cls = (k: MissingField, extra = "") => `inp${extra}${miss(k) ? " missing" : ""}`;
  const desc = (k: MissingField) => (miss(k) ? `hint-${k}` : undefined);
  let n = 0;

  return (
    <div>
      <div className="pv">
        <CompanyAvatar name={draft.company || "?"} logoUrl={draft.logoUrl} size={44} />
        <div className="pv-text">
          <div className="pv-title">{draft.title || "Posisi belum diisi"}</div>
          <div className="pv-sub">
            {draft.company || "Perusahaan belum diisi"} · via {draft.platform}
            {draft.city ? ` · ${draft.city}` : ""}
          </div>
        </div>
        <div className="pv-chips">
          <span className="tag">{draft.mode}</span>
          <span className="tag">{draft.type}</span>
        </div>
      </div>

      {confidence && !editing ? <ConfidenceBanner confidence={confidence} missing={missing} note={note} httpStatus={httpStatus} /> : <div style={{ height: 18 }} />}
      {!editing && (confidence === "failed" || confidence === null || !!paste.shot) && <TextPaste paste={paste} defaultOpen={!!note} />}

      <div className="form">
        <motion.div className="fld" {...fieldAnim(n++)}>
          <label htmlFor="f-company">
            Perusahaan<span className="req" aria-hidden="true">*</span>
          </label>
          <input id="f-company" className={cls("company")} value={draft.company} onChange={(e) => set("company", e.target.value)} placeholder="Nama perusahaan" required aria-describedby={desc("company")} maxLength={200} />
          {miss("company") && <MissingHint id="hint-company" />}
        </motion.div>
        <motion.div className="fld" {...fieldAnim(n++)}>
          <label htmlFor="f-title">
            Posisi<span className="req" aria-hidden="true">*</span>
          </label>
          <input id="f-title" className={cls("title")} value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="mis. Product Designer" required aria-describedby={desc("title")} maxLength={300} />
          {miss("title") && <MissingHint id="hint-title" />}
        </motion.div>
        <motion.div className="fld" {...fieldAnim(n++)}>
          <label htmlFor="f-city">Lokasi</label>
          <input id="f-city" className={cls("city")} value={draft.city} onChange={(e) => set("city", e.target.value)} placeholder="Kota" aria-describedby={desc("city")} maxLength={200} />
          {miss("city") && <MissingHint id="hint-city" />}
        </motion.div>
        <motion.div className="fld" {...fieldAnim(n++)}>
          <label htmlFor="f-platform">Platform</label>
          <Select id="f-platform" value={draft.platform} options={PLATFORMS} onChange={(v) => set("platform", v)} />
        </motion.div>
        <motion.div className="fld span2" {...fieldAnim(n++)}>
          <span className="flbl" id="lbl-mode">
            Mode kerja
          </span>
          <Segmented id="mode" labelledBy="lbl-mode" value={draft.mode} options={MODES.map((m) => ({ value: m, label: m }))} onChange={(v) => set("mode", v)} />
        </motion.div>
        <motion.div className="fld" {...fieldAnim(n++)}>
          <label htmlFor="f-type">Tipe</label>
          <Select id="f-type" value={draft.type} options={JOB_TYPES} onChange={(v) => set("type", v)} />
        </motion.div>
        <motion.div className="fld" {...fieldAnim(n++)}>
          <label htmlFor="f-level">Level</label>
          <Select id="f-level" value={draft.level} options={LEVELS} onChange={(v) => set("level", v)} />
        </motion.div>
        <motion.div className="fld" {...fieldAnim(n++)}>
          <label htmlFor="f-salary">Gaji</label>
          <input id="f-salary" className={cls("salary", " mono")} value={draft.salary} onChange={(e) => set("salary", e.target.value)} placeholder="mis. Rp 15–20 jt" aria-describedby={desc("salary")} maxLength={120} />
          {miss("salary") && <MissingHint id="hint-salary" />}
        </motion.div>
        <motion.div className="fld" {...fieldAnim(n++)}>
          <label htmlFor="f-posted">Diposting</label>
          <input id="f-posted" type="date" className={cls("postedAt")} value={draft.postedAt ?? ""} onChange={(e) => set("postedAt", e.target.value || null)} aria-describedby={desc("postedAt")} />
          {miss("postedAt") && <MissingHint id="hint-postedAt" />}
        </motion.div>
        <motion.div className="fld" {...fieldAnim(n++)}>
          <label htmlFor="f-deadline">Deadline</label>
          <input id="f-deadline" type="date" className={cls("deadline")} value={draft.deadline ?? ""} onChange={(e) => set("deadline", e.target.value || null)} aria-describedby={desc("deadline")} />
          {miss("deadline") && <MissingHint id="hint-deadline" />}
        </motion.div>
        <motion.div className="fld" {...fieldAnim(n++)}>
          <label htmlFor="f-status">Status</label>
          <Select id="f-status" value={draft.status} options={STATUSES} labels={STATUS_LABEL} onChange={(v) => set("status", v)} />
        </motion.div>
        <motion.div className="fld" {...fieldAnim(n++)}>
          <span className="flbl" id="lbl-pri">
            Prioritas
          </span>
          <Segmented id="pri" labelledBy="lbl-pri" value={draft.priority} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} onChange={(v) => set("priority", v)} />
        </motion.div>
        {showUrl && (
          <motion.div className="fld span2" {...fieldAnim(n++)}>
            <label htmlFor="f-url">Link lowongan</label>
            <input id="f-url" className="inp mono" type="url" value={draft.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" maxLength={2048} />
          </motion.div>
        )}
        <motion.div className="fld span2" {...fieldAnim(n++)}>
          <label htmlFor="f-notes">Catatan</label>
          <textarea id="f-notes" className="inp" value={draft.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Referral, kontak HR, hal yang perlu disiapkan…" maxLength={5000} />
        </motion.div>
      </div>
      {editing && history && history.length > 0 && (
        <section className="hist" aria-labelledby="hist-h">
          <h3 id="hist-h" className="hist-h">
            Riwayat status
          </h3>
          <ol className="hist-list">
            {history.map((e, i) => (
              <li key={`${e.at}-${i}`}>
                <span className={`chip s-${e.status}`}>
                  <span className="cdot" />
                  {STATUS_LABEL[e.status]}
                </span>
                <span className="mono hist-at">{fmtSent(e.at)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export interface PasteBox {
  text: string;
  setText: (v: string) => void;
  /** Pesan hasil pengisian terakhir (kolom apa yang terisi). */
  msg: string;
  onFill: () => void;
  shot: Shot | null;
  onRemoveShot: () => void;
  onPickFile: (file: File) => void;
}

function TextPaste({ paste, defaultOpen }: { paste: PasteBox; defaultOpen: boolean }) {
  const file = useRef<HTMLInputElement>(null);
  const reading = paste.shot?.status === "reading";
  return (
    <details className="paste-box" open={defaultOpen || !!paste.shot || undefined}>
      <summary>Tempel teks atau gambar lowongan</summary>
      <p className="set-hint" style={{ marginTop: 8 }}>
        Salin caption, pesan, atau teks halaman lowongannya (Ctrl+A lalu Ctrl+C) lalu tempel di sini. Atau tempel
        tangkapan layarnya (Ctrl+V), teksnya dibaca di browsermu dan gambarnya tidak diunggah. Lokerku mengisi kolom yang
        polanya jelas dan tidak menimpa yang sudah kamu isi.
      </p>
      {paste.shot && <ImageChip shot={paste.shot} onRemove={paste.onRemoveShot} />}
      <label className="sr-only" htmlFor="f-paste">
        Teks lowongan
      </label>
      <textarea
        id="f-paste"
        className="inp"
        value={paste.text}
        onChange={(e) => paste.setText(e.target.value)}
        placeholder="Tempel caption, pesan, atau gambar lowongan di sini…"
        maxLength={5000}
      />
      <div className="paste-actions">
        <button type="button" className="btn btn-ghost btn-sm" disabled={!paste.text.trim() || reading} onClick={paste.onFill}>
          Isi dari teks
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={reading} onClick={() => file.current?.click()}>
          <ImageIcon className="ic" strokeWidth={1.75} aria-hidden />
          Pilih gambar
        </button>
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) paste.onPickFile(f);
            e.target.value = "";
          }}
        />
        <span role="status" aria-live="polite" className="set-hint" style={{ margin: 0 }}>
          {paste.msg}
        </span>
      </div>
    </details>
  );
}
