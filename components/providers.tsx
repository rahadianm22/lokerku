"use client";

import { MotionConfig } from "motion/react";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "./toast";

export function Providers({ authEnabled, children }: { authEnabled: boolean; children: React.ReactNode }) {
  return (
    // Tanpa kredensial Google, sesi dipaksa null supaya tidak ada request ke /api/auth.
    <SessionProvider session={authEnabled ? undefined : null} refetchOnWindowFocus={authEnabled}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>{children}</ToastProvider>
      </MotionConfig>
    </SessionProvider>
  );
}
