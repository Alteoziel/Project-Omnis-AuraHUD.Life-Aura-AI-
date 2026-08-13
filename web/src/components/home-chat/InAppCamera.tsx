"use client";

import { useEffect, useRef, useState } from "react";
import { openInAppCamera, stopMediaStream } from "@/lib/home-chat/camera";
import {
  PhotoSendQueueStrip,
  type PhotoSendQueueItem,
} from "@/components/home-chat/PhotoSendQueueStrip";

export function InAppCamera({
  mode,
  onClose,
  onCapture,
  onFrame,
  onError,
  actionLabel,
  sendQueue = [],
}: {
  mode: "photo" | "scan";
  onClose: () => void;
  onCapture?: (video: HTMLVideoElement) => void | Promise<void>;
  onFrame?: (video: HTMLVideoElement) => void | Promise<void>;
  onError?: (message: string) => void;
  actionLabel: string;
  sendQueue?: PhotoSendQueueItem[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  const onFrameRef = useRef(onFrame);
  const onCaptureRef = useRef(onCapture);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [switching, setSwitching] = useState(false);
  const [flipNote, setFlipNote] = useState<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
    onFrameRef.current = onFrame;
    onCaptureRef.current = onCapture;
  }, [onClose, onError, onFrame, onCapture]);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      const stream = await openInAppCamera(facing);
      if (cancelled) {
        stopMediaStream(stream);
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        if (video.videoWidth > 0) setReady(true);
      }
      setSwitching(false);
    };
    void start().catch((err: unknown) => {
      if (cancelled) return;
      setSwitching(false);
      if (facing !== "environment") {
        setFlipNote("Could not switch to the front camera.");
        setFacing("environment");
        return;
      }
      onErrorRef.current?.(
        err instanceof Error ? err.message : "Could not open the camera.",
      );
      onCloseRef.current();
    });
    return () => {
      cancelled = true;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, [facing]);

  useEffect(() => {
    if (mode !== "scan") return;
    let frame = 0;
    let ticks = 0;
    let scanning = false;
    const tick = () => {
      frame = window.requestAnimationFrame(tick);
      ticks += 1;
      if (ticks % 6 !== 0 || scanning) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      scanning = true;
      void Promise.resolve(onFrameRef.current?.(video)).finally(() => {
        scanning = false;
      });
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  return (
    <div className="fixed inset-0 z-[90] bg-ink-950">
      <video
        ref={videoRef}
        className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`}
        playsInline
        muted
        autoPlay
        onLoadedData={() => setReady(true)}
      />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="rounded-full bg-ink-950/55 px-3 py-1 text-xs font-bold text-sand-50">
          {mode === "photo"
            ? busy
              ? "Adding to queue…"
              : sendQueue.length > 0
                ? "Keep shooting · queue will send"
                : "In-app camera · not saved to Photos"
            : "Point at a Home Chat code"}
        </p>
        <button
          type="button"
          onClick={() => onCloseRef.current()}
          className="min-h-11 touch-manipulation rounded-full bg-sand-50 px-3 py-1.5 text-sm font-bold text-ink-900"
        >
          Close
        </button>
      </div>
      {mode === "photo" ? (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="w-full">
            <PhotoSendQueueStrip items={sendQueue} tone="dark" />
          </div>
          <div className="flex w-full items-center justify-center gap-10 px-8">
            <button
              type="button"
              disabled={!ready || busy || switching}
              onClick={() => {
                if (!ready || busy || switching) return;
                setSwitching(true);
                setReady(false);
                setFlipNote(null);
                setFacing((current) =>
                  current === "environment" ? "user" : "environment",
                );
              }}
              className="min-h-11 min-w-16 touch-manipulation rounded-full bg-ink-950/55 px-4 py-2 text-sm font-bold text-sand-50 disabled:opacity-40"
            >
              Flip
            </button>
            <button
              type="button"
              disabled={!ready || busy}
              onClick={() => {
                const video = videoRef.current;
                if (!video || !video.videoWidth || busy) return;
                setBusy(true);
                void Promise.resolve(onCaptureRef.current?.(video)).finally(() => {
                  setBusy(false);
                });
              }}
              className="h-16 w-16 touch-manipulation rounded-full border-4 border-sand-50 bg-moss-500 shadow-lg disabled:opacity-40"
              aria-label={actionLabel}
            />
            <span className="min-w-16" aria-hidden />
          </div>
          <p className="text-xs font-semibold text-sand-50">
            {flipNote
              ? flipNote
              : !ready
                ? switching
                  ? "Switching camera…"
                  : "Starting camera…"
                : busy
                  ? "Queuing…"
                  : sendQueue.length > 0
                    ? "Tap for another · sending in the background"
                    : facing === "user"
                    ? "Front camera · tap to send"
                    : "Tap to send a one-time photo"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
