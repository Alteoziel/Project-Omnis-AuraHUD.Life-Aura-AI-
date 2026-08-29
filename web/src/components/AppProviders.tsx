"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { StoreProvider } from "@/components/StoreProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>{children}</ToastProvider>
    </StoreProvider>
  );
}
