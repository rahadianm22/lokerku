"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardPaste,
  ExternalLink,
  Link2,
  Loader2,
  PencilLine,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { detectPlatform } from "@/lib/platform";
import { fromDateInput, toDateInput } from "@/lib/format";
import {
  STATUS_META,
  WORK_MODE_LABEL,
  type ExtractResponse,
  type Job,
  type JobStatus,
  type Priority,
  type WorkMode,
} from "@/lib/types";
import { CompanyAvatar } from "./CompanyAvatar";

type Draft = Omit<Job, "id" | "addedAt" | "updatedAt" | "appliedAt">;
type Step = "link" | "loading" | "review";

const blankDraft = (url = ""): Draft => ({
  url,
  platform: url ? detectPlatform(url) : "",
  company: "",
  title: "",
  location: "",
  workMode: "unknown",
  employmentType: "",
  salary: "",
  seniority: "",
  postedAt: null,
  deadline: null,
  description: "",
  logo: null,
  status: "saved",
  priority: "med",
  notes: "",
});

function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    return u.hostname.includes(".") ? u.toString() : "";
  } catch {
    return "";
  }
}

const LOADING_STEPS = ["Membuka halaman…", "Mencari data lowongan…", "Merapikan hasil…"];

const spring = { type: "spring", stiffness: 380, damping: 32 } as const;

export function AddJobModal({
  open,
  editing,
  existingUrls,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: Job | null;
  existingUrls: string[];
  onClose: () => void;
  onSave: (job: Job, isEdit: boolean) => void;
}) {
  const [step, setStep] = useState<Step>("link");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft());
  const [loadingIdx, setLoadingIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // reset tiap modal dibuka
  useEffect(() => {
    if (!open) return;
    abortRef.current?.abort();
    setError("");
    setResult(null);
    if (editing) {
      const { id: _id, addedAt: _a, updatedAt: _u, appliedAt: _ap, ...rest } = editing;
      setDraft(rest);
      setUrl(editing.url);
      setStep("review");
    } else {
      setDraft(blankDraft());
      setUrl("");
      setStep("link");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, editing]);

  // ganti label loading
  useEffect(() => {
    if (step !== "loading") return;
    setLoadingIdx(0);
    const t = setInterval(() => setLoadingIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1)), 1100);
    return () => clearInterval(t);
  }, [step]);

  // Esc untuk tutup
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const normalized = normalizeUrl(url);
  const isDuplicate =
    !!normalized && existingUrls.includes(normalized) && normalized !== editing?.url;

  async function extract(target = url) {
    const u = normalizeUrl(target);
    if (!u) {
      setError("Link-nya belum valid. Contoh: https://www.linkedin.com/jobs/view/…");
      return;
    }
    setUrl(u);
    setError("");
    setStep("loading");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: u }),
        signal: ctrl.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal mengambil data");
      const r = json as ExtractResponse;
      setResult(r);
      setDraft({ ...blankDraft(u), ...r.data });
      setStep("review");
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setResult(null);
      setError(e instanceof Error ? e.message : "Gagal mengambil data");
      setDraft(blankDraft(u));
      setStep("review");
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      if (normalizeUrl(text)) extract(text);
    } catch {
      inputRef.current?.focus();
    }
  }

  function manual() {
    const u = normalizeUrl(url);
    setResult(null);
    setDraft(blankDraft(u));
    setStep("review");
  }

  function save() {
    const now = new Date().toISOString();
    const finalUrl = normalizeUrl(draft.url) || draft.url;
    const job: Job = editing
      ? { ...editing, ...draft, url: finalUrl, updatedAt: now }
      : {
          ...draft,
          url: finalUrl,
          platform: draft.platform || detectPlatform(finalUrl),
          id: crypto.randomUUID(),
          addedAt: now,
          updatedAt: now,
          appliedAt: draft.status === "applied" ? now : null,
        };
    onSave(job, !!editing);
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const canSave = draft.company.trim() && draft.title.trim();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Edit loker" : "Tambah loker"}
            layout
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={spring}
            className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-[var(--shadow-lg)] sm:rounded-3xl"
          >
            {/* header */}
            <motion.div layout="position" className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="grid size-7 place-items-center rounded-lg bg-accent text-accent-ink">
                  {editing ? <PencilLine size={15} /> : <Link2 size={15} />}
                </span>
                {editing ? "Edit loker" : step === "review" ? "Cek dulu sebelum simpan" : "Tambah loker dari link"}
              </div>
              <button
                onClick={onClose}
                className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </motion.div>

            <div className="scrollbar-thin overflow-y-auto px-6 pb-6">
              <AnimatePresence mode="wait" initial={false}>
                {/* STEP 1 — link */}
                {step === "link" && (
                  <motion.div
                    key="link"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        extract();
                      }}
                    >
                      <div className="group relative">
                        <Link2
                          size={18}
                          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
                        />
                        <input
                          ref={inputRef}
                          value={url}
                          onChange={(e) => {
                            setUrl(e.target.value);
                            setError("");
                          }}
                          onPaste={(e) => {
                            const text = e.clipboardData.getData("text");
                            if (normalizeUrl(text) && !url) {
                              e.preventDefault();
                              setUrl(text);
                              extract(text);
                            }
                          }}
                          placeholder="Tempel link lowongan di sini…"
                          inputMode="url"
                          autoComplete="off"
                          className="field !rounded-2xl !py-4 !pr-28 !pl-11 !text-base"
                        />
                        <button
                          type="button"
                          onClick={pasteFromClipboard}
                          className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-2 transition hover:border-ink hover:text-ink"
                        >
                          <ClipboardPaste size={14} /> Tempel
                        </button>
                      </div>

                      <AnimatePresence>
                        {(error || isDuplicate) && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`mt-2 flex items-center gap-1.5 text-xs ${error ? "text-danger" : "text-warn"}`}
                          >
                            <AlertTriangle size={13} />
                            {error || "Link ini sudah ada di tabel."}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <p className="mt-3 text-xs leading-relaxed text-muted">
                        Bisa dari LinkedIn, JobStreet, Glints, Kalibrr, Dealls, Indeed, karier perusahaan,
                        dll. Data diambil otomatis — nanti tetap bisa kamu edit.
                      </p>

                      <div className="mt-6 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={manual}
                          className="text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline"
                        >
                          Isi manual saja
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          type="submit"
                          disabled={!url.trim()}
                          className="flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-bg transition disabled:opacity-30"
                        >
                          <Sparkles size={15} /> Ambil data
                        </motion.button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* STEP 2 — loading */}
                {step === "loading" && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="py-2"
                  >
                    <div className="rounded-2xl border border-line p-4">
                      <div className="flex items-center gap-3">
                        <div className="shimmer size-11 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <div className="shimmer h-3.5 w-3/4 rounded" />
                          <div className="shimmer h-3 w-1/2 rounded" />
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="shimmer h-8 rounded-lg" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-2">
                      <Loader2 size={15} className="animate-spin" />
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={loadingIdx}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                        >
                          {LOADING_STEPS[loadingIdx]}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <div className="mt-1 truncate text-center font-mono text-[11px] text-muted">{url}</div>
                  </motion.div>
                )}

                {/* STEP 3 — review & edit */}
                {step === "review" && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* preview card */}
                    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3">
                      <CompanyAvatar name={draft.company || "?"} logo={draft.logo} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{draft.title || "Posisi belum diisi"}</div>
                        <div className="truncate text-sm text-muted">
                          {draft.company || "Perusahaan?"}
                          {draft.platform && ` · via ${draft.platform}`}
                        </div>
                      </div>
                      {draft.url && (
                        <a
                          href={draft.url}
                          target="_blank"
                          rel="noreferrer"
                          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                          aria-label="Buka link"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>

                    {!editing && <ConfidenceBanner result={result} error={error} />}

                    <motion.div
                      className="mt-4 grid grid-cols-2 gap-3"
                      initial="hidden"
                      animate="show"
                      variants={{ show: { transition: { staggerChildren: 0.025 } } }}
                    >
                      {!draft.url || editing ? (
                        <Field label="Link lowongan" full>
                          <input className="field font-mono !text-xs" value={draft.url} onChange={(e) => set("url", e.target.value)} />
                        </Field>
                      ) : null}
                      <Field label="Perusahaan *">
                        <input className="field" value={draft.company} onChange={(e) => set("company", e.target.value)} />
                      </Field>
                      <Field label="Posisi *">
                        <input className="field" value={draft.title} onChange={(e) => set("title", e.target.value)} />
                      </Field>
                      <Field label="Lokasi">
                        <input className="field" value={draft.location} onChange={(e) => set("location", e.target.value)} />
                      </Field>
                      <Field label="Platform">
                        <input className="field" value={draft.platform} onChange={(e) => set("platform", e.target.value)} />
                      </Field>
                      <Field label="Mode kerja" full>
                        <Segmented<WorkMode>
                          value={draft.workMode}
                          onChange={(v) => set("workMode", v)}
                          options={(["remote", "hybrid", "onsite", "unknown"] as WorkMode[]).map((v) => ({
                            v,
                            label: v === "unknown" ? "Belum tahu" : WORK_MODE_LABEL[v],
                          }))}
                          layoutId="mode"
                        />
                      </Field>
                      <Field label="Tipe">
                        <input className="field" placeholder="Full-time / Kontrak" value={draft.employmentType} onChange={(e) => set("employmentType", e.target.value)} />
                      </Field>
                      <Field label="Level">
                        <input className="field" placeholder="Senior / Lead" value={draft.seniority} onChange={(e) => set("seniority", e.target.value)} />
                      </Field>
                      <Field label="Gaji" full>
                        <input className="field" placeholder="IDR 15–20 jt / bln" value={draft.salary} onChange={(e) => set("salary", e.target.value)} />
                      </Field>
                      <Field label="Diposting">
                        <input type="date" className="field" value={toDateInput(draft.postedAt)} onChange={(e) => set("postedAt", fromDateInput(e.target.value))} />
                      </Field>
                      <Field label="Deadline">
                        <input type="date" className="field" value={toDateInput(draft.deadline)} onChange={(e) => set("deadline", fromDateInput(e.target.value))} />
                      </Field>
                      <Field label="Status">
                        <select className="field" value={draft.status} onChange={(e) => set("status", e.target.value as JobStatus)}>
                          {Object.entries(STATUS_META).map(([k, m]) => (
                            <option key={k} value={k}>{m.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Prioritas">
                        <Segmented<Priority>
                          value={draft.priority}
                          onChange={(v) => set("priority", v)}
                          options={[
                            { v: "low", label: "Rendah" },
                            { v: "med", label: "Sedang" },
                            { v: "high", label: "Tinggi" },
                          ]}
                          layoutId="prio"
                        />
                      </Field>
                      <Field label="Catatan" full>
                        <textarea
                          rows={2}
                          className="field resize-none"
                          placeholder="Referral dari siapa, kontak HR, dll."
                          value={draft.notes}
                          onChange={(e) => set("notes", e.target.value)}
                        />
                      </Field>
                    </motion.div>

                    {isDuplicate && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-warn">
                        <AlertTriangle size={13} /> Link ini sudah pernah kamu simpan.
                      </p>
                    )}

                    <div className="mt-6 flex items-center justify-between gap-3">
                      {!editing ? (
                        <button
                          onClick={() => setStep("link")}
                          className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
                        >
                          ← Ganti link
                        </button>
                      ) : (
                        <span />
                      )}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={!canSave}
                        onClick={save}
                        className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink shadow-sm transition disabled:opacity-40"
                      >
                        {editing ? "Simpan perubahan" : "Simpan ke tabel"} <ArrowRight size={15} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------- */

function ConfidenceBanner({ result, error }: { result: ExtractResponse | null; error: string }) {
  if (!result && !error) return null;
  const tone =
    result?.confidence === "high"
      ? { icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-500/10 border-emerald-500/25", text: "Data lengkap terdeteksi." }
      : result?.confidence === "partial"
        ? { icon: AlertTriangle, cls: "text-amber-600 bg-amber-500/10 border-amber-500/25", text: "Sebagian data terdeteksi — lengkapi yang kosong." }
        : { icon: AlertTriangle, cls: "text-rose-600 bg-rose-500/10 border-rose-500/25", text: "Halaman tidak bisa dibaca — isi manual ya." };
  const Icon = tone.icon;
  const extra = result?.warnings.filter((w) => !w.startsWith("Data terstruktur")) ?? [];
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-3 rounded-xl border px-3 py-2 text-xs ${tone.cls}`}
    >
      <div className="flex items-center gap-1.5 font-medium">
        <Icon size={14} /> {error || tone.text}
      </div>
      {result?.confidence !== "high" && extra.length > 0 && (
        <ul className="mt-1 list-inside list-disc opacity-80">
          {extra.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <motion.label
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      className={`flex flex-col gap-1.5 ${full ? "col-span-2" : "col-span-2 sm:col-span-1"}`}
    >
      <span className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</span>
      {children}
    </motion.label>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  layoutId,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
  layoutId: string;
}) {
  return (
    <div className="flex rounded-[10px] border border-line bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          type="button"
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`relative flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
            value === o.v ? "text-accent-ink" : "text-muted hover:text-ink"
          }`}
        >
          {value === o.v && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-lg bg-accent"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
