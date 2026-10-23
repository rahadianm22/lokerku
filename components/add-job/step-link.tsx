"use client";

import { Check, ClipboardPaste, Link2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { detectedLabel, detectPlatform } from "@/lib/platform";
import type { Job } from "@/lib/types";
import { toHttpUrl } from "@/lib/url";

export function StepLink({
  url,
  onUrl,
  onSubmit,
  error,
  duplicate,
  onShowDuplicate,
}: {
  url: string;
  onUrl: (v: string) => void;
  onSubmit: () => void;
  error: string;
  duplicate: Job | null;
  onShowDuplicate: (j: Job) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const platform = toHttpUrl(url) ? detectPlatform(url) : null;

  useEffect(() => {
    // Jangan rebut fokus kalau dialog sudah ditutup (mis. Esc dalam 60ms pertama) dan fokus sudah dikembalikan.
    const t = setTimeout(() => {
      const a = document.activeElement;
      if (!a || a === document.body || a.getAttribute("role") === "dialog") input.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, []);

  async function paste() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) onUrl(text);
    } catch {
      /* izin clipboard ditolak: biarkan pengguna menempel manual */
    }
    input.current?.focus();
  }

  return (
    <form
      id="lk-step-link"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label className="lbl" htmlFor="lk-url">
        Link lowongan
      </label>
      <div className="url">
        <Link2 className="ic" strokeWidth={1.75} aria-hidden />
        <input
          ref={input}
          id="lk-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://www.linkedin.com/jobs/view/…"
          value={url}
          onChange={(e) => onUrl(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "lk-url-err lk-url-help" : "lk-url-help"}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={paste}>
          <ClipboardPaste className="ic" strokeWidth={1.75} aria-hidden />
          Tempel
        </button>
      </div>
      <div aria-live="polite">
        <AnimatePresence>
          {platform && !error && (
            <motion.span
              key={platform}
              className="det"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2 }}
            >
              <Check className="ic" strokeWidth={2} aria-hidden />
              {detectedLabel(platform)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {error && (
        <p id="lk-url-err" className="field-err" role="alert">
          {error}
        </p>
      )}
      {duplicate && (
        <div className="dup" role="status">
          <span>Loker ini sudah ada di tabel</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onShowDuplicate(duplicate)}>
            Lihat
          </button>
        </div>
      )}
      <p id="lk-url-help" className="help">
        Didukung: LinkedIn, JobStreet, Glints, Kalibrr, dan halaman karier perusahaan. Kalau halaman tidak terbaca, kamu
        tetap bisa isi manual.
      </p>
      <div className="sites" aria-hidden="true">
        <span className="tag">linkedin.com</span>
        <span className="tag">jobstreet.co.id</span>
        <span className="tag">glints.com</span>
        <span className="tag">kalibrr.com</span>
        <span className="tag">karier.perusahaan.com</span>
      </div>
    </form>
  );
}
