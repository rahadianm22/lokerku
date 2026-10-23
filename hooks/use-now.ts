"use client";

import { useEffect, useState } from "react";

/** Waktu sekarang yang diperbarui tiap 60 detik, untuk label relatif seperti "5 menit yang lalu". */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
