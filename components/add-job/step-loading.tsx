"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { shortUrl } from "@/lib/url";

const TEXTS = ["Membuka halaman…", "Mencari data lowongan…", "Merapikan hasil…"];

export function StepLoading({ url }: { url: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => Math.min(v + 1, TEXTS.length - 1)), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <div className="pv" aria-hidden="true">
        <div className="sk" style={{ width: 44, height: 44, borderRadius: 12, flex: "none" }} />
        <div className="pv-text" style={{ gap: 8 }}>
          <div className="sk" style={{ width: "62%", height: 14 }} />
          <div className="sk" style={{ width: "38%", height: 11 }} />
        </div>
        <div className="pv-chips">
          <div className="sk" style={{ width: 64, height: 24, borderRadius: 999 }} />
          <div className="sk" style={{ width: 52, height: 24, borderRadius: 999 }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 12 }} aria-hidden="true">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="sk" style={{ height: 40, borderRadius: 10 }} />
        ))}
      </div>
      <div className="load-head">
        <span className="spin" aria-hidden="true" />
        <div aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              className="load-text"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {TEXTS[i]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <ul className="ls-list" aria-hidden="true">
        {TEXTS.map((t, k) => (
          <li key={t} className={`ls${k < i ? " done" : k === i ? " on" : ""}`}>
            <span className="b">{k < i && <Check className="ic" strokeWidth={2.5} />}</span>
            {t}
          </li>
        ))}
      </ul>
      <div className="load-url">{shortUrl(url)}</div>
    </div>
  );
}
