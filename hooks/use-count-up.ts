"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Count-up 750ms ease-out cubic dari angka yang sedang tampil (0 saat mount). Reduced motion: langsung final. */
export function useCountUp(value: number, duration = 750) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    if (reduce) {
      current.current = value;
      return;
    }
    const start = performance.now();
    const from = current.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const v = Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      current.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);

  return reduce ? value : shown;
}
