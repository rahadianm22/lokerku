"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginButton({ className = "btn btn-ink", children = "Masuk dengan Google" }: { className?: string; children?: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={() => {
        setBusy(true);
        signIn("google", { callbackUrl: "/app" });
      }}
    >
      {busy ? "Membuka Google…" : children}
    </button>
  );
}
