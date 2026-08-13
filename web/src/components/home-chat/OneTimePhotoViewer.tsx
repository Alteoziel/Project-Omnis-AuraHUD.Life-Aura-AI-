"use client";

import { useEffect, useRef } from "react";

export function OneTimePhotoViewer({
  bytes,
  onClose,
}: {
  bytes: Uint8Array;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = new Blob([bytes.slice()], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
    };
    image.src = url;
    return () => {
      URL.revokeObjectURL(url);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [bytes]);

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col bg-ink-950"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-300">
          One-time photo · closes and deletes
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-sand-50 px-3 py-1.5 text-sm font-bold text-ink-900"
        >
          Done
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full touch-none select-none"
          style={{ WebkitTouchCallout: "none" }}
        />
      </div>
    </div>
  );
}
