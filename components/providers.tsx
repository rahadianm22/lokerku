"use client";

import { MotionConfig } from "motion/react";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { ToastProvider } from "./toast";

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
