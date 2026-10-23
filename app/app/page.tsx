import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { authEnabled } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Tabel loker",
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <AppShell authEnabled={authEnabled} />;
}
