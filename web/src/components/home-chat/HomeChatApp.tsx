"use client";

import { useCallback } from "react";
import { InAppCamera } from "@/components/home-chat/InAppCamera";
import { OneTimePhotoViewer } from "@/components/home-chat/OneTimePhotoViewer";
import { useHomeChat } from "@/components/home-chat/useHomeChat";
import { isHomeChatCode, normalizeHomeChatCode } from "@/lib/home-chat/codes";

const fieldClass =
  "mt-1 min-h-12 w-full touch-manipulation rounded-xl border border-ink-900/10 bg-white px-3 py-3 text-base tracking-[0.18em] outline-none ring-moss-400 focus:ring-2";

export function HomeChatApp({ displayName }: { displayName: string }) {
  const chat = useHomeChat(displayName);

  const onScanFrame = useCallback(
    (video: HTMLVideoElement) => chat.scanFrame(video),
    [chat],
  );

  return (
    <div className="space-y-4">
      {chat.error ? (
        <div className="rounded-2xl border border-coral-500/35 bg-coral-400/10 px-4 py-3 text-sm text-ink-800">
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
          onCancel={() => void chat.hangUp()}
        />
      ) : null}

      {chat.phase === "chat" ? (
        <ChatPanel
          peerName={chat.peerName}
          fingerprint={chat.fingerprint}
          thread={chat.thread}
          draft={chat.draft}
          setDraft={chat.setDraft}
          onSend={() => void chat.sendText()}
          onPhoto={() => chat.setCameraMode("photo")}
          onOpenPhoto={(id) => void chat.openPhoto(id)}
          onHangUp={() => void chat.hangUp()}
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
    <>
      <div className="card-surface rounded-2xl p-4">
        <p className="text-sm text-ink-700">
          Send texts and one-time photos to someone next to you. Pair in person,
          then everything travels on an encrypted nearby link. Photos are taken
          inside the app — they never go to the iPhone Photos library — and they
          disappear after they’re opened.
        </p>
        <p className="mt-3 text-xs text-ink-600">
          {bluetoothSupported
            ? "This browser can use Bluetooth for pairing when a nearby Home Chat is advertising."
            : "iPhone PWAs can’t use the Bluetooth radio (an Apple limit). Home Chat still works: pair with a QR or code, then chat over an encrypted link on the same Wi‑Fi."}
        </p>
      </div>

      <button
        type="button"
        onClick={onHost}
        className="w-full rounded-2xl bg-ink-900 px-4 py-3.5 text-sm font-bold text-sand-50 hover:bg-ink-800"
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
            onChange={(event) => setJoinCode(normalizeHomeChatCode(event.target.value))}
            className={fieldClass}
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
    </>
  );
}

function PairingPanel({
  phase,
  code,
  qrUrl,
  fingerprint,
  bluetoothNote,
  onCancel,
}: {
  phase: "hosting" | "connecting";
  code: string;
  qrUrl: string | null;
  fingerprint: string | null;
  bluetoothNote: string | null;
  onCancel: () => void;
}) {
  return (
    <div className="card-surface space-y-4 rounded-2xl p-4 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss-500">
        {phase === "hosting" ? "Waiting nearby" : "Connecting"}
      </p>
      {qrUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrUrl}
          alt="Home Chat pairing QR code"
          className="mx-auto h-52 w-52 rounded-2xl bg-sand-50"
        />
      ) : (
        <div className="mx-auto h-52 w-52 animate-pulse rounded-2xl bg-sand-200/80" />
      )}
      <p className="font-display text-3xl font-bold tracking-[0.22em] text-ink-900">
        {code}
      </p>
      <p className="text-sm text-ink-600">
        Let the other person scan this or type the code. Stay on the same Wi‑Fi.
      </p>
      {fingerprint ? (
        <p className="text-xs font-bold text-moss-700">
          Match this code on both phones: {fingerprint}
        </p>
      ) : null}
      {bluetoothNote ? <p className="text-xs text-ink-600">{bluetoothNote}</p> : null}
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl px-4 py-2 text-sm font-bold text-ink-600 hover:bg-ink-900/5"
      >
        Cancel
      </button>
    </div>
  );
}

function ChatPanel({
  peerName,
  fingerprint,
  thread,
  draft,
  setDraft,
  onSend,
  onPhoto,
  onOpenPhoto,
  onHangUp,
}: {
  peerName: string;
  fingerprint: string | null;
  thread: ReturnType<typeof useHomeChat>["thread"];
  draft: string;
  setDraft: (value: string) => void;
  onSend: () => void;
  onPhoto: () => void;
  onOpenPhoto: (id: string) => void;
  onHangUp: () => void;
}) {
  return (
    <div className="flex min-h-[28rem] flex-col">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold text-ink-900">{peerName}</p>
          <p className="text-xs text-moss-700">
            Encrypted nearby link{fingerprint ? ` · ${fingerprint}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onHangUp}
          className="rounded-xl bg-coral-500 px-3 py-2 text-xs font-bold text-sand-50"
        >
          End
        </button>
      </div>

      <div className="card-surface flex min-h-0 flex-1 flex-col rounded-2xl">
        <ul className="flex-1 space-y-2 overflow-y-auto p-3">
          {thread.length === 0 ? (
            <li className="py-8 text-center text-sm text-ink-600">
              You’re connected. Messages and one-time photos stay on these two
              phones.
            </li>
          ) : null}
          {thread.map((item) => (
            <li
              key={item.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
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
          className="flex gap-2 border-t border-ink-900/10 p-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSend();
          }}
        >
          <button
            type="button"
            onClick={onPhoto}
            className="rounded-xl bg-sand-100 px-3 py-2 text-sm font-bold text-ink-800"
          >
            Photo
          </button>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-ink-900/10 bg-white px-3 text-sm outline-none ring-moss-400 focus:ring-2"
            placeholder="Message"
            maxLength={2000}
          />
          <button
            type="submit"
            className="rounded-xl bg-ink-900 px-3 py-2 text-sm font-bold text-sand-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
