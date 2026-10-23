"use client";

import { StoreProvider } from "@/lib/store";
import { Tracker } from "./tracker";

export function AppShell({ authEnabled }: { authEnabled: boolean }) {
  return (
    <StoreProvider authEnabled={authEnabled}>
      <Tracker />
    </StoreProvider>
  );
}
