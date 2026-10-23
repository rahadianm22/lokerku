"use client";

import { motion } from "motion/react";

const SLIDE = { duration: 0.3, ease: [0.3, 0.7, 0.2, 1] as const };

/** Kontrol segmented dengan satu indikator lime yang meluncur (layoutId bersama). */
export function Segmented<T extends string>({
  id,
  labelledBy,
  value,
  options,
  onChange,
}: {
  id: string;
  labelledBy: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-labelledby={labelledBy} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(o.value)}>
            {on && <motion.span layoutId={`seg-${id}`} className="seg-ind" transition={SLIDE} aria-hidden />}
            <span className="seg-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
