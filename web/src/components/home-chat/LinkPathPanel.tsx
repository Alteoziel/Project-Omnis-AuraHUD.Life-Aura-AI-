"use client";

import { useState } from "react";
import type { LinkHop, LinkReport, ScreenWatch } from "@/lib/home-chat/link-report";

export function LinkPathPanel({
  report,
  screenWatch,
  fingerprint,
}: {
  report: LinkReport | null;
  screenWatch: ScreenWatch;
  fingerprint: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathLabel = report?.pathLabel ?? "Reading nearby path…";
  const warned = Boolean(report?.warning);

  return (
    <div className="border-b border-ink-900/10 bg-sand-50/80 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`Chat path: ${pathLabel}. ${screenWatch.label}`}
        className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left"
      >
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            warned
              ? "bg-coral-500"
              : report?.pathKind === "direct" || report?.pathKind === "stun"
                ? "bg-moss-500"
                : "bg-ink-400"
          }`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-ink-900">
            {pathLabel}
          </span>
          <span className="block truncate text-[11px] text-ink-600">
            {screenWatch.label}
          </span>
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-moss-600">
          {open ? "Hide" : "Path"}
        </span>
      </button>

      {open ? (
        <div className="mt-2 space-y-3 rounded-2xl bg-white px-3 py-3 shadow-soft">
          <ol className="space-y-0">
            {(report?.hops ?? PLACEHOLDER_HOPS).map((hop, index, hops) => (
              <HopRow
                key={hop.id}
                hop={hop}
                last={index === hops.length - 1}
              />
            ))}
          </ol>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-ink-600">
            <div>
              <dt className="font-bold uppercase tracking-[0.12em] text-ink-500">
                This side
              </dt>
              <dd className="mt-0.5 text-ink-800">
                {report?.localAddress ?? "…"}
                {report?.localType ? ` · ${report.localType}` : ""}
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[0.12em] text-ink-500">
                Their side
              </dt>
              <dd className="mt-0.5 text-ink-800">
                {report?.remoteAddress ?? "…"}
                {report?.remoteType ? ` · ${report.remoteType}` : ""}
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[0.12em] text-ink-500">
                Link
              </dt>
              <dd className="mt-0.5 text-ink-800">
                DTLS {report?.dtls ?? "…"} · ICE {report?.ice ?? "…"}
              </dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-[0.12em] text-ink-500">
                Frames
              </dt>
              <dd className="mt-0.5 text-ink-800">
                {report?.messagesSent ?? "—"} sent · {report?.messagesReceived ?? "—"} in
              </dd>
            </div>
          </dl>

          {fingerprint ? (
            <p className="text-[11px] font-bold text-moss-700">
              Match this on both phones: {fingerprint}
            </p>
          ) : null}

          {report?.warning ? (
            <p className="rounded-xl bg-coral-400/15 px-3 py-2 text-xs text-coral-600">
              {report.warning}
            </p>
          ) : null}

          <p className="text-[11px] leading-relaxed text-ink-600">
            This thread only shows frames that decrypt with your pairing key.
            Someone on the Wi‑Fi can see encrypted blobs, but an extra packet
            cannot appear here as a second photo.
          </p>
          <p className="text-[11px] leading-relaxed text-ink-600">
            {screenWatch.detail}
          </p>
        </div>
      ) : null}
    </div>
  );
}

const PLACEHOLDER_HOPS: LinkHop[] = [
  {
    id: "you",
    title: "This device",
    detail: "Waiting to read the nearby link.",
    tone: "muted",
  },
  {
    id: "link",
    title: "Nearby link",
    detail: "Path appears once the encrypted channel is up.",
    tone: "muted",
  },
  {
    id: "them",
    title: "Their device",
    detail: "Only frames that decrypt with your pairing key can appear here.",
    tone: "muted",
  },
];

function HopRow({ hop, last }: { hop: LinkHop; last: boolean }) {
  const dot =
    hop.tone === "warn"
      ? "bg-coral-500"
      : hop.tone === "ok"
        ? "bg-moss-500"
        : "bg-ink-300";
  return (
    <li className="flex gap-3">
      <div className="flex w-3 shrink-0 flex-col items-center">
        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />
        {last ? null : <span className="mt-1 w-px flex-1 bg-ink-900/15" aria-hidden />}
      </div>
      <div className={`min-w-0 ${last ? "pb-0" : "pb-3"}`}>
        <p className="text-xs font-bold text-ink-900">{hop.title}</p>
        <p className="text-[11px] leading-relaxed text-ink-600">{hop.detail}</p>
      </div>
    </li>
  );
}
