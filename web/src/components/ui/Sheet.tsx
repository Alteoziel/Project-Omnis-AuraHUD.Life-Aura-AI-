"use client";

import type { ReactNode } from "react";

export function Sheet({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="relative w-full max-w-lg rounded-t-card border border-white/10 bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-glow"
      >
        <h2 id="sheet-title" className="font-display text-xl text-white">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
