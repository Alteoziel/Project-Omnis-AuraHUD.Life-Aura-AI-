"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { InAppCamera } from "@/components/home-chat/InAppCamera";
import { OneTimePhotoViewer } from "@/components/home-chat/OneTimePhotoViewer";
import { useHomeChat } from "@/components/home-chat/useHomeChat";
import { isHomeChatCode, normalizeHomeChatCode } from "@/lib/home-chat/codes";

export function HomeChatApp({ displayName }: { displayName: string }) {
  const chat = useHomeChat(displayName);
  const scrollerRef = useRef<HTMLUListElement>(null);

  const onScanFrame = useCallback(
    (video: HTMLVideoElement) => chat.scanFrame(video),
    [chat],
  );

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [chat.thread.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-app-glow">
      <header className="flex items-center justify-between gap-3 border-b border-ink-900/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-moss-500">
            Home Chat
          </p>
          <h1 className="truncate font-display text-xl font-bold text-ink-900">
            {chat.phase === "chat" ? chat.peerName : "Nearby, encrypted"}
          </h1>
          <p className="truncate text-xs text-ink-600">
            {chat.phase === "chat"
              ? `One-time photos · ${chat.fingerprint ?? "encrypted link"}`
              : "Texts and photos stay on these two phones"}
          </p>
        </div>
        {chat.phase === "chat" || chat.phase === "hosting" || chat.phase === "connecting" ? (
          <button
            type="button"
            onClick={() => void chat.hangUp()}
            className="rounded-full bg-coral-500 px-3 py-2 text-xs font-bold text-sand-50"
          >
            {chat.phase === "chat" ? "End" : "Cancel"}
          </button>
        ) : null}
      </header>

      {chat.error ? (
        <div className="mx-4 mt-3 rounded-2xl border border-coral-500/35 bg-coral-400/10 px-4 py-3 text-sm text-ink-800">
          {chat.error}
          <button
            type="button"
            className="ml-2 font-bold text-moss-700"
            onClick={chat.resetError}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {chat.phase === "idle" ? (
        <IdlePanel
          bluetoothSupported={chat.bluetooth.supported}
          onHost={() => void chat.startHost()}
          onScan={() => chat.setCameraMode("scan")}
          joinCode={chat.joinCode}
          setJoinCode={chat.setJoinCode}
          onJoin={() => void chat.joinWithInvite(chat.joinCode)}
          onBluetooth={
            chat.bluetooth.canRequestDevice
              ? () => void chat.joinFromBluetooth()
              : undefined
          }
        />
      ) : null}

      {chat.phase === "hosting" || chat.phase === "connecting" ? (
        <PairingPanel
          phase={chat.phase}
          code={chat.code}
          qrUrl={chat.qrUrl}
          fingerprint={chat.fingerprint}
          bluetoothNote={chat.bluetoothNote}
        />
      ) : null}

      {chat.phase === "chat" ? (
        <ChatPanel
          scrollerRef={scrollerRef}
          thread={chat.thread}
          draft={chat.draft}
          setDraft={chat.setDraft}
          onSend={() => void chat.sendText()}
          onPhoto={() => chat.setCameraMode("photo")}
          onOpenPhoto={(id) => void chat.openPhoto(id)}
        />
      ) : null}

      {chat.cameraMode ? (
        <InAppCamera
          mode={chat.cameraMode}
          actionLabel={chat.cameraMode === "photo" ? "Take photo" : "Scan code"}
          onClose={() => chat.setCameraMode(null)}
          onCapture={(video) => chat.sendPhoto(video)}
          onFrame={chat.cameraMode === "scan" ? onScanFrame : undefined}
          onError={(message) => {
            chat.setCameraMode(null);
            chat.fail(message);
          }}
        />
      ) : null}

      {chat.viewingPhoto ? (
        <OneTimePhotoViewer
          bytes={chat.viewingPhoto.bytes}
          onClose={() => void chat.closePhoto()}
        />
      ) : null}
    </div>
  );
}

function IdlePanel({
  bluetoothSupported,
  onHost,
  onScan,
  joinCode,
  setJoinCode,
  onJoin,
  onBluetooth,
}: {
  bluetoothSupported: boolean;
  onHost: () => void;
  onScan: () => void;
  joinCode: string;
  setJoinCode: (value: string) => void;
  onJoin: () => void;
  onBluetooth?: () => void;
}) {
  const normalized = normalizeHomeChatCode(joinCode);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      <div className="card-surface rounded-2xl p-4">
        <p className="text-sm text-ink-700">
          Pair while you’re next to each other, then send texts and one-time
          photos over an encrypted nearby link. The in-app camera never writes
          to the iPhone Photos library. Opened photos are wiped.
        </p>
        <p className="mt-3 text-xs text-ink-600">
          {bluetoothSupported
            ? "This browser can use Bluetooth for pairing when a nearby Home Chat is advertising."
            : "iPhone PWAs can’t use the Bluetooth radio. Scan the QR or type the code — chat still uses an encrypted link on the same Wi‑Fi."}
        </p>
      </div>

      <button
        type="button"
        onClick={onHost}
        className="w-full rounded-2xl bg-ink-900 px-4 py-4 text-sm font-bold text-sand-50 hover:bg-ink-800"
      >
        Start Home Chat
      </button>

      <div className="card-surface space-y-3 rounded-2xl p-4">
        <h2 className="font-display text-lg font-bold text-ink-900">Join nearby</h2>
        <button
          type="button"
          onClick={onScan}
          className="w-full rounded-2xl bg-moss-500 px-4 py-3 text-sm font-bold text-sand-50"
        >
          Scan their code
        </button>
        {onBluetooth ? (
          <button
            type="button"
            onClick={onBluetooth}
            className="w-full rounded-2xl bg-sand-100 px-4 py-3 text-sm font-bold text-ink-800"
          >
            Find over Bluetooth
          </button>
        ) : null}
        <label className="block text-sm font-semibold text-ink-700">
          Or type their 8-character code
          <input
            value={joinCode}
            onChange={(event) =>
              setJoinCode(normalizeHomeChatCode(event.target.value))
            }
            className="mt-1 min-h-12 w-full rounded-xl border border-ink-900/10 bg-white px-3 py-3 text-base tracking-[0.18em] outline-none ring-moss-400 focus:ring-2"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={8}
            placeholder="ABCD2345"
          />
        </label>
        <button
          type="button"
          disabled={!isHomeChatCode(normalized)}
          onClick={onJoin}
          className="w-full rounded-2xl bg-ink-900 px-4 py-3 text-sm font-bold text-sand-50 disabled:opacity-40"
        >
          Join Home Chat
        </button>
      </div>
    </div>
  );
}

function PairingPanel({
  phase,
  code,
  qrUrl,
  fingerprint,
  bluetoothNote,
}: {
  phase: "hosting" | "connecting";
  code: string;
  qrUrl: string | null;
  fingerprint: string | null;
  bluetoothNote: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss-500">
        {phase === "hosting" ? "Waiting nearby" : "Connecting"}
      </p>
      {qrUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrUrl}
          alt="Home Chat pairing QR code"
          className="mt-4 h-56 w-56 rounded-3xl bg-sand-50 shadow-card"
        />
      ) : (
        <div className="mt-4 h-56 w-56 animate-pulse rounded-3xl bg-sand-200/80" />
      )}
      <p className="mt-4 font-display text-4xl font-bold tracking-[0.24em] text-ink-900">
        {code}
      </p>
      <p className="mt-2 max-w-xs text-sm text-ink-600">
        Let them scan this or type the code. Stay on the same Wi‑Fi.
      </p>
      {fingerprint ? (
        <p className="mt-3 text-xs font-bold text-moss-700">
          Match this on both phones: {fingerprint}
        </p>
      ) : null}
      {bluetoothNote ? (
        <p className="mt-3 max-w-sm text-xs text-ink-600">{bluetoothNote}</p>
      ) : null}
    </div>
  );
}

function ChatPanel({
  scrollerRef,
  thread,
  draft,
  setDraft,
  onSend,
  onPhoto,
  onOpenPhoto,
}: {
  scrollerRef: RefObject<HTMLUListElement | null>;
  thread: ReturnType<typeof useHomeChat>["thread"];
  draft: string;
  setDraft: (value: string) => void;
  onSend: () => void;
  onPhoto: () => void;
  onOpenPhoto: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul
        ref={scrollerRef}
        className="flex-1 space-y-2 overflow-y-auto px-4 py-3"
      >
        {thread.length === 0 ? (
          <li className="py-10 text-center text-sm text-ink-600">
            Connected. Messages never leave these two phones.
          </li>
        ) : null}
        {thread.map((item) => (
          <li
            key={item.id}
            className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
              item.from === "me"
                ? "ml-auto bg-moss-500 text-sand-50"
                : "bg-sand-100 text-ink-900"
            }`}
          >
            {item.kind === "text" ? (
              item.body
            ) : item.state === "ready" ? (
              <button
                type="button"
                onClick={() => onOpenPhoto(item.id)}
                className="font-bold underline"
              >
                One-time photo · tap to view
              </button>
            ) : item.state === "sent" ? (
              "One-time photo sent"
            ) : (
              "Photo viewed and removed"
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2 border-t border-ink-900/10 bg-sand-50 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <button
          type="button"
          onClick={onPhoto}
          className="rounded-xl bg-sand-100 px-3 py-3 text-sm font-bold text-ink-800"
        >
          Photo
        </button>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-ink-900/10 bg-white px-3 text-base outline-none ring-moss-400 focus:ring-2"
          placeholder="Message"
          maxLength={2000}
        />
        <button
          type="submit"
          className="rounded-xl bg-ink-900 px-4 py-3 text-sm font-bold text-sand-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
