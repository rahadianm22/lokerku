"use client";

import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMedia } from "@/hooks/use-media";
import { detectPlatform } from "@/lib/platform";
import type { Settings } from "@/lib/settings";
import type { Confidence, Draft, ExtractResult, Job, MissingField } from "@/lib/types";
import { normalizeUrl, toHttpUrl } from "@/lib/url";
import { parsePostText } from "@/lib/extract/text";
import { StepLink } from "./step-link";
import { StepLoading } from "./step-loading";
import { StepReview } from "./step-review";

type Step = "link" | "loading" | "review";

export type DialogMode = { kind: "add" } | { kind: "edit"; job: Job };

const blank = (url: string, s: Settings): Draft => ({
  url,
  company: "",
  title: "",
  city: "",
  platform: detectPlatform(url) ?? "Lainnya",
  mode: "Belum tahu",
  type: "Full-time",
  level: "Mid",
  salary: "",
  postedAt: null,
  deadline: null,
  status: s.defaultStatus,
  priority: s.defaultPriority,
  notes: "",
});

function toDraft(j: Job): Draft {
  const d: Partial<Job> = { ...j };
  delete d.id;
  delete d.createdAt;
  delete d.updatedAt;
  delete d.deletedAt;
  return d as Draft;
}

const STEP_EASE = [0.2, 0.8, 0.2, 1] as const;
const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 36 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -36 }),
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AddJobDialog({
  mode,
  jobs,
  settings,
  onClose,
  onSave,
  onShowExisting,
}: {
  mode: DialogMode;
  jobs: Job[];
  settings: Settings;
  onClose: () => void;
  onSave: (draft: Draft, editing: Job | null) => void;
  onShowExisting: (job: Job) => void;
}) {
  const editing = mode.kind === "edit" ? mode.job : null;
  const mobile = useMedia("(max-width: 760px)");
  const reduce = useReducedMotion();
  const drag = useDragControls();

  const [step, setStep] = useState<Step>(editing ? "review" : "link");
  const [dir, setDir] = useState(1);
  const [url, setUrl] = useState(editing?.url ?? "");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft>(editing ? toDraft(editing) : blank("", settings));
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [loginOnly, setLoginOnly] = useState(false);
  const [missing, setMissing] = useState<MissingField[]>([]);
  const [showUrl, setShowUrl] = useState(!!editing);
  const abort = useRef<AbortController | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const byUrl = useMemo(() => {
    const m = new Map<string, Job>();
    for (const j of jobs) if (j.url) m.set(normalizeUrl(j.url), j);
    return m;
  }, [jobs]);
  const duplicate = (() => {
    const key = normalizeUrl(url);
    const hit = key ? byUrl.get(key) : undefined;
    return hit && hit.id !== editing?.id ? hit : null;
  })();

  const go = (next: Step, d: number) => {
    setDir(d);
    setStep(next);
  };

  const set = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v })), []);
  const canSave = !!draft.company.trim() && !!draft.title.trim();

  /** `raw` diisi saat link baru saja ditempel (state `url` belum sempat berubah). */
  async function fetchData(raw?: string) {
    const target = toHttpUrl(raw ?? url);
    if (!target) {
      setError("Link belum valid. Contoh: https://www.linkedin.com/jobs/view/…");
      return;
    }
    setError("");
    setUrl(target);
    // Simpan otomatis tidak boleh membuat loker kembar: biarkan pengguna melihat banner duplikat.
    if (raw !== undefined && byUrl.has(normalizeUrl(target))) return;
    go("loading", 1);
    const ctrl = new AbortController();
    abort.current = ctrl;
    const timeout = setTimeout(() => ctrl.abort("timeout"), 12_000);
    let result: ExtractResult;
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
        signal: ctrl.signal,
      });
      if (res.status === 400 || res.status === 429) {
        const { error: msg } = await res.json().catch(() => ({ error: "" }));
        setError(msg || "Link ini tidak bisa diproses.");
        go("link", -1);
        return;
      }
      result = res.ok ? await res.json() : { confidence: "failed", missing: [], data: {} };
    } catch {
      // Batal oleh pengguna: kembali ke langkah 1 tanpa pesan.
      if (ctrl.signal.aborted && ctrl.signal.reason !== "timeout") return;
      result = { confidence: "failed", missing: ["company", "title", "city", "salary", "postedAt", "deadline"], data: {} };
    } finally {
      clearTimeout(timeout);
      abort.current = null;
    }
    const base = blank(target, settings);
    const d = result.data;
    const filled: Draft = {
      ...base,
      company: d.company ?? "",
      title: d.title ?? "",
      city: d.city ?? "",
      platform: d.platform ?? base.platform,
      mode: d.mode ?? base.mode,
      type: d.type ?? base.type,
      level: d.level ?? base.level,
      salary: d.salary ?? "",
      postedAt: d.postedAt ?? null,
      deadline: d.deadline ?? null,
      logoUrl: d.logoUrl,
      url: target,
    };
    // Simpan otomatis hanya kalau perusahaan dan posisi terbaca. Selain itu form tetap dibuka untuk dilengkapi.
    if (settings.autoSave && result.confidence !== "failed" && !byUrl.has(normalizeUrl(target)) && filled.company.trim() && filled.title.trim()) {
      onSave(filled, null);
      return;
    }
    setDraft(filled);
    setConfidence(result.confidence);
    setLoginOnly(result.note === "login-required");
    setMissing(result.confidence === "failed" ? ["company", "title", "city", "salary", "postedAt", "deadline"] : result.missing);
    setShowUrl(false);
    go("review", 1);
  }

  function cancelFetch() {
    abort.current?.abort("user");
    go("link", -1);
  }

  /** Isi hanya kolom yang masih kosong (atau masih bawaan), supaya isian pengguna tidak tertimpa. */
  function fillFromText(text: string): string[] {
    const f = parsePostText(text);
    const next: Draft = { ...draft };
    const filled: string[] = [];
    const take = <K extends keyof Draft>(k: K, label: string, v: Draft[K] | undefined, isEmpty: boolean) => {
      if (v === undefined || v === "" || !isEmpty) return;
      next[k] = v;
      filled.push(label);
    };
    take("title", "Posisi", f.title, !draft.title.trim());
    take("company", "Perusahaan", f.company, !draft.company.trim());
    take("city", "Lokasi", f.city, !draft.city.trim());
    take("salary", "Gaji", f.salary, !draft.salary.trim());
    take("deadline", "Deadline", f.deadline ?? undefined, !draft.deadline);
    take("mode", "Mode kerja", f.mode, draft.mode === "Belum tahu");
    take("level", "Level", f.level, draft.level === "Mid");
    take("notes", "Catatan", f.notes, !draft.notes.trim());
    setDraft(next);
    return filled;
  }

  function manual() {
    const target = toHttpUrl(url);
    setDraft(blank(target || "", settings));
    setConfidence(null);
    setMissing([]);
    setShowUrl(!target);
    go("review", 1);
  }

  function save() {
    if (!canSave) return;
    const clean: Draft = {
      ...draft,
      company: draft.company.trim(),
      title: draft.title.trim(),
      city: draft.city.trim(),
      salary: draft.salary.trim(),
      url: toHttpUrl(draft.url) || draft.url.trim(),
    };
    onSave(clean, editing);
  }

  function back() {
    if (editing) onClose();
    else go("link", -1);
  }

  /* Focus trap & Ctrl/⌘+Enter. Esc ditangani di window (lihat effect di bawah). */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && step === "review") {
      e.preventDefault();
      save();
      return;
    }
    if (e.key === "Tab" && panel.current) {
      const list = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Pindahkan fokus ke dalam dialog seketika, field yang tepat menyusul setelah animasi masuk.
    panel.current?.focus();
    if (editing) setTimeout(() => panel.current?.querySelector<HTMLElement>("#f-company")?.focus(), 60);
    return () => {
      document.body.style.overflow = prev;
      abort.current?.abort("user");
    };
  }, [editing]);

  // Esc menutup dialog dari mana pun fokusnya, termasuk sebelum fokus sempat masuk ke dialog.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      abort.current?.abort("user");
      closeRef.current();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  // Saat pindah langkah, fokus ke judul supaya pembaca layar mengumumkan langkah baru.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (step === "review") panel.current?.querySelector<HTMLElement>("#lk-mtitle")?.focus();
  }, [step]);

  const stepNum = step === "link" ? 1 : step === "loading" ? 2 : 3;
  const title = step === "link" ? "Tempel link lowongan" : step === "loading" ? "Mengambil data…" : editing ? editing.title || "Edit loker" : "Cek & rapikan data";

  const enter = mobile
    ? { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" }, transition: { duration: 0.46, ease: [0.2, 0.9, 0.25, 1.04] as const } }
    : {
        initial: { opacity: 0, y: 32, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.18 } },
        transition: { type: "spring" as const, stiffness: 380, damping: 30 },
      };

  return (
    <>
      <motion.div className="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} aria-hidden="true" />
      <div
        className="ov-wrap"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          ref={panel}
          className={`modal${step === "review" ? " wide" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lk-mtitle"
          tabIndex={-1}
          style={{ outline: "none" }}
          onKeyDown={onKeyDown}
          {...enter}
          drag={mobile && !reduce ? "y" : false}
          dragControls={drag}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 600) onClose();
          }}
        >
          <div className="grab" aria-hidden="true" onPointerDown={(e) => drag.start(e)} style={{ touchAction: "none" }} />
          <div className="m-head" onPointerDown={(e) => mobile && drag.start(e)}>
            <div style={{ minWidth: 0 }}>
              <p className="eyebrow">{editing ? "Edit loker" : `Tambah loker · Langkah ${stepNum} dari 3`}</p>
              <h2 id="lk-mtitle" tabIndex={-1} style={{ outline: "none" }}>
                {title}
              </h2>
            </div>
            <div className="m-head-r">
              {!editing && (
                <div className="dots" aria-hidden="true">
                  {[1, 2, 3].map((i) => (
                    <span key={i} className={`dot${i < stepNum ? " done" : ""}${i === stepNum ? " on" : ""}`} />
                  ))}
                </div>
              )}
              <button type="button" className="close" onClick={onClose} aria-label="Tutup">
                <X className="ic" width={18} height={18} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </div>

          <div className="m-body">
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: STEP_EASE }}
              >
                {step === "link" && (
                  <StepLink
                    url={url}
                    onUrl={(v) => {
                      setUrl(v);
                      setError("");
                    }}
                    onSubmit={fetchData}
                    autoSave={settings.autoSave}
                    error={error}
                    duplicate={duplicate}
                    onShowDuplicate={onShowExisting}
                  />
                )}
                {step === "loading" && <StepLoading url={url} />}
                {step === "review" && (
                  <StepReview draft={draft} set={set} confidence={confidence} missing={missing} editing={!!editing} showUrl={showUrl} loginOnly={loginOnly} onFillFromText={fillFromText} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {step === "link" && (
            <div className="m-foot">
              <button type="button" className="linkbtn" onClick={manual}>
                Isi manual saja
              </button>
              <button type="submit" form="lk-step-link" className="btn btn-ink" disabled={!url.trim()}>
                Ambil data
                <ArrowRight className="ic" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          )}
          {step === "loading" && (
            <div className="m-foot">
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Biasanya 2–5 detik</span>
              <button type="button" className="btn btn-ghost" onClick={cancelFetch}>
                Batal
              </button>
            </div>
          )}
          {step === "review" && (
            <div className="m-foot">
              <button type="button" className="btn btn-ghost" onClick={back}>
                {!editing && <ArrowLeft className="ic" strokeWidth={1.75} aria-hidden />}
                {editing ? "Batal" : "Ganti link"}
              </button>
              <button type="button" className="btn btn-accent" onClick={save} disabled={!canSave} aria-keyshortcuts="Control+Enter Meta+Enter">
                <Check className="ic" strokeWidth={2} aria-hidden />
                {editing ? "Simpan perubahan" : "Simpan ke tabel"}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
