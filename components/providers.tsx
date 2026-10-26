"use client";

import { MotionConfig, MotionGlobalConfig } from "motion/react";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { ToastProvider } from "./toast";

/**
 * "Kurangi gerakan": spesifikasi §8 meminta SEMUA animasi mati. `reducedMotion="user"` dari motion hanya mematikan
 * gerakan transform (fade tetap jalan), jadi semua animasi motion dilewati langsung ke keadaan akhirnya.
 * Diset di level modul supaya sudah berlaku sebelum animasi pertama.
 */
if (typeof window !== "undefined") {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    MotionGlobalConfig.skipAnimations = mq.matches;
  };
  sync();
  mq.addEventListener("change", sync);
}

export function Providers({ authEnabled, children }: { authEnabled: boolean; children: React.ReactNode }) {
  // Service worker hanya di produksi: di dev, cache-nya bikin perubahan kode tidak langsung terlihat.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);

  return (
    // Tanpa kredensial Google, sesi dipaksa null supaya tidak ada request ke /api/auth.
    <SessionProvider session={authEnabled ? undefined : null} refetchOnWindowFocus={authEnabled}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>{children}</ToastProvider>
      </MotionConfig>
    </SessionProvider>
  );
}
