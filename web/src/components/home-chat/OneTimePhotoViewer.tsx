"use client";

import { useEffect, useRef } from "react";
import { shouldCloseOpenPhotoOnLeave } from "@/lib/home-chat/store";

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
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const blob = new Blob([buffer], { type: "image/jpeg" });
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
      blankCanvas(canvas);
    };
  }, [bytes]);

  useEffect(() => {
    const leave = (event: Event) => {
      if (!shouldCloseOpenPhotoOnLeave(event.type, document.visibilityState)) {
        return;
      }
      blankCanvas(canvasRef.current);
      onClose();
    };
    document.addEventListener("visibilitychange", leave);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", leave);
      window.removeEventListener("pagehide", leave);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col bg-ink-950"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-300">
          One-time photo · leaves with you
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

function blankCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  canvas.width = 0;
  canvas.height = 0;
}
