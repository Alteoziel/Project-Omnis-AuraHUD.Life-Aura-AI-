"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  advertiseHomeChatInvite,
  getBluetoothCapability,
  requestNearbyHomeChatDevice,
} from "@/lib/home-chat/bluetooth";
import { captureFrameToJpeg } from "@/lib/home-chat/camera";
import { generateHomeChatCode, isHomeChatCode, normalizeHomeChatCode } from "@/lib/home-chat/codes";
import {
  b64UrlToBytes,
  decryptBytes,
  decryptText,
  deriveSessionKey,
  encryptBytes,
  encryptText,
  exportPublicKeyB64,
  generateHomeChatKeyPair,
  importPublicKeyB64,
  pairingFingerprint,
  wipeBytes,
  type HomeChatKeyPair,
} from "@/lib/home-chat/crypto";
import { encodeHomeChatInvite, parseHomeChatInvite } from "@/lib/home-chat/invite";
import { HomeChatPeer } from "@/lib/home-chat/peer";
import {
  assemblePhotoChunks,
  describeHomeChatError,
  encodeControl,
  isControlRaw,
  MAX_TEXT_CHARS,
  parseControl,
  parsePhotoChunk,
  splitPhotoChunks,
  type ControlMessage,
} from "@/lib/home-chat/protocol";
import { upsertReaction, type ChatReaction } from "@/lib/home-chat/reactions";
import { renderInviteQrDataUrl } from "@/lib/home-chat/qr";
import {
  closeHomeChatRoom,
  closeHomeChatRoomKeepalive,
  closeLeftoverHomeChatRoom,
  createHomeChatRoom,
  fetchHomeChatRoom,
  joinHomeChatRoom,
  peekRememberedHomeChatRoom,
} from "@/lib/home-chat/signaling";
import {
  consumeOneTimePhoto,
  purgeHomeChatPhotos,
  saveOneTimePhoto,
} from "@/lib/home-chat/store";

export type ChatPhase = "idle" | "hosting" | "joining" | "connecting" | "chat";

export type ThreadItem =
  | {
      id: string;
      kind: "text";
      from: "me" | "them";
      body: string;
      reactions: ChatReaction[];
    }
  | {
      id: string;
      kind: "photo";
      from: "me" | "them";
      state: "ready" | "removed" | "sent";
      reactions: ChatReaction[];
    };

type PhotoAssembler = {
  total: number;
  chunks: Map<number, Uint8Array>;
};

export function useHomeChat(displayName: string) {
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [peerName, setPeerName] = useState("Nearby");
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [draft, setDraft] = useState("");
  const [cameraMode, setCameraMode] = useState<"photo" | "scan" | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{
    id: string;
    bytes: Uint8Array;
  } | null>(null);
  const [bluetoothNote, setBluetoothNote] = useState<string | null>(null);
  const bluetooth = getBluetoothCapability();

  const keysRef = useRef<HomeChatKeyPair | null>(null);
  const myPublicKeyRef = useRef<string | null>(null);
  const sessionKeyRef = useRef<CryptoKey | null>(null);
  const peerRef = useRef<HomeChatPeer | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const roleRef = useRef<"host" | "guest" | null>(null);
  const assemblersRef = useRef(new Map<string, PhotoAssembler>());
  const pendingRef = useRef<(string | Uint8Array)[]>([]);
  const stopAdvertiseRef = useRef<(() => void) | null>(null);
  const guestWaitRef = useRef<number | null>(null);
  const hangingUpRef = useRef(false);

  const resetError = useCallback(() => setError(null), []);

  const hangUp = useCallback(async (opts?: { keepalive?: boolean }) => {
    hangingUpRef.current = true;
    stopAdvertiseRef.current?.();
    stopAdvertiseRef.current = null;
    if (guestWaitRef.current != null) {
      window.clearInterval(guestWaitRef.current);
      guestWaitRef.current = null;
    }
    const roomId = roomIdRef.current ?? peekRememberedHomeChatRoom();
    roomIdRef.current = null;
    await peerRef.current?.close();
    peerRef.current = null;
    if (roomId) {
      if (opts?.keepalive) {
        closeHomeChatRoomKeepalive(roomId);
      } else {
        await closeHomeChatRoom(roomId).catch(() => undefined);
      }
      await purgeHomeChatPhotos(roomId).catch(() => undefined);
    }
    roleRef.current = null;
    sessionKeyRef.current = null;
    assemblersRef.current.clear();
    pendingRef.current = [];
    setThread([]);
    setDraft("");
    setQrUrl(null);
    setFingerprint(null);
    setPeerName("Nearby");
    setPhase("idle");
    setCameraMode(null);
    setViewingPhoto(null);
    setBluetoothNote(null);
  }, []);

  useEffect(() => {
    void closeLeftoverHomeChatRoom();
    const onLeave = () => {
      void hangUp({ keepalive: true });
    };
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
      void hangUp();
    };
  }, [hangUp]);

  const ensureKeys = useCallback(async () => {
    if (!keysRef.current) {
      keysRef.current = await generateHomeChatKeyPair();
      myPublicKeyRef.current = await exportPublicKeyB64(keysRef.current.publicKey);
    }
    return {
      keys: keysRef.current,
      publicKey: myPublicKeyRef.current!,
    };
  }, []);

  const setSessionFromPeerKey = useCallback(async (peerPublicKey: string) => {
    const { keys, publicKey } = await ensureKeys();
    const imported = await importPublicKeyB64(peerPublicKey);
    sessionKeyRef.current = await deriveSessionKey(keys.privateKey, imported);
    setFingerprint(await pairingFingerprint(publicKey, peerPublicKey));
  }, [ensureKeys]);

  const handleControl = useCallback(async (message: ControlMessage) => {
    if (message.type === "hello") {
      setPeerName(message.displayName || "Nearby");
      return;
    }
    if (message.type === "text") {
      setThread((items) => [
        ...items,
        { id: message.id, kind: "text", from: "them", body: message.body, reactions: [] },
      ]);
      return;
    }
    if (message.type === "photo-meta") {
      assemblersRef.current.set(message.id, {
        total: 0,
        chunks: new Map(),
      });
      return;
    }
    if (message.type === "photo-end") {
      const assembler = assemblersRef.current.get(message.id);
      const roomId = roomIdRef.current;
      const sessionKey = sessionKeyRef.current;
      if (!assembler || !roomId || !sessionKey) return;
      const sealed = assemblePhotoChunks(assembler.total, assembler.chunks);
      for (const part of assembler.chunks.values()) wipeBytes(part);
      assemblersRef.current.delete(message.id);
      const plain = await decryptBytes(sessionKey, sealed);
      wipeBytes(sealed);
      await saveOneTimePhoto({
        id: message.id,
        roomId,
        createdAt: new Date().toISOString(),
        mime: "image/jpeg",
        bytes: plain,
      });
      wipeBytes(plain);
      setThread((items) => [
        ...items,
        { id: message.id, kind: "photo", from: "them", state: "ready", reactions: [] },
      ]);
      return;
    }
    if (message.type === "viewed") {
      setThread((items) =>
        items.map((item) =>
          item.id === message.id && item.kind === "photo"
            ? { ...item, state: "removed" }
            : item,
        ),
      );
      return;
    }
    if (message.type === "react") {
      setThread((items) =>
        items.map((item) =>
          item.id === message.id
            ? {
                ...item,
                reactions: upsertReaction(item.reactions, "them", message.emoji),
              }
            : item,
        ),
      );
    }
  }, []);

  const ingestFrame = useCallback(
    async (raw: string | Uint8Array) => {
      const sessionKey = sessionKeyRef.current;
      if (!sessionKey) {
        pendingRef.current.push(raw);
        return;
      }
      const payload = typeof raw === "string" ? b64UrlToBytes(raw) : raw;
      const plain = await decryptText(sessionKey, payload);
      if (!isControlRaw(plain) && plain.includes("\n")) {
        const parsed = parsePhotoChunk(plain);
        const assembler = assemblersRef.current.get(parsed.header.id) ?? {
          total: parsed.header.total,
          chunks: new Map(),
        };
        assembler.total = parsed.header.total;
        assembler.chunks.set(parsed.header.index, parsed.bytes);
        assemblersRef.current.set(parsed.header.id, assembler);
        return;
      }
      const message = parseControl(plain);
      if (!message) return;
      await handleControl(message);
    },
    [handleControl],
  );

  const flushPending = useCallback(async () => {
    const queued = pendingRef.current;
    pendingRef.current = [];
    for (const raw of queued) {
      await ingestFrame(raw);
    }
  }, [ingestFrame]);

  const sendControl = useCallback(async (message: ControlMessage | string) => {
    const sessionKey = sessionKeyRef.current;
    const peer = peerRef.current;
    if (!sessionKey || !peer?.connected) {
      throw new Error("Nearby link is not ready.");
    }
    const frame = typeof message === "string" ? message : encodeControl(message);
    await peer.sendWhenReady(await encryptText(sessionKey, frame));
  }, []);

  const connectPeer = useCallback(
    async (role: "host" | "guest", roomId: string) => {
      roleRef.current = role;
      roomIdRef.current = roomId;
      const peer = new HomeChatPeer({
        role,
        roomId,
        handlers: {
          onMessage: (data) => {
            void ingestFrame(data);
          },
          onState: (state) => {
            if (state === "channel-open") {
              setPhase("chat");
              void (async () => {
                if (sessionKeyRef.current) {
                  await sendControl({
                    v: 1,
                    type: "hello",
                    publicKey: myPublicKeyRef.current ?? "",
                    displayName,
                  });
                  await flushPending();
                }
              })();
            }
            if (state === "failed" || state === "disconnected") {
              if (hangingUpRef.current) return;
              setError("The nearby link dropped. Start a new Home Chat.");
              void hangUp();
            }
          },
        },
      });
      peerRef.current = peer;
      await peer.start();
    },
    [displayName, flushPending, hangUp, ingestFrame, sendControl],
  );

  const startHost = useCallback(async () => {
    hangingUpRef.current = false;
    setError(null);
    setPhase("connecting");
    try {
      const { publicKey } = await ensureKeys();
      const nextCode = generateHomeChatCode();
      const room = await createHomeChatRoom({ code: nextCode, publicKey });
      setCode(nextCode);
      setPhase("hosting");
      const invite = encodeHomeChatInvite({ code: nextCode, publicKey });
      setQrUrl(await renderInviteQrDataUrl(invite));
      if (bluetooth.canAdvertise) {
        try {
          stopAdvertiseRef.current = await advertiseHomeChatInvite(invite);
          setBluetoothNote("Broadcasting a Bluetooth pairing beacon.");
        } catch {
          setBluetoothNote("Bluetooth advertising isn’t available. Use the code or QR.");
        }
      } else if (!bluetooth.supported) {
        setBluetoothNote(
          "iPhone PWAs can’t use the Bluetooth radio. Pair with the QR or code — the chat still goes over an encrypted nearby link on the same Wi‑Fi.",
        );
      }
      await connectPeer("host", room.id);
      guestWaitRef.current = window.setInterval(() => {
        void (async () => {
          const latest = await fetchHomeChatRoom(room.id);
          if (latest?.guest_public_key && !sessionKeyRef.current) {
            await setSessionFromPeerKey(latest.guest_public_key);
            if (guestWaitRef.current != null) {
              window.clearInterval(guestWaitRef.current);
              guestWaitRef.current = null;
            }
            await flushPending();
          }
        })();
      }, 1000);
    } catch (err) {
      await hangUp();
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Could not start Home Chat.");
    }
  }, [
    bluetooth.canAdvertise,
    bluetooth.supported,
    connectPeer,
    ensureKeys,
    flushPending,
    hangUp,
    setSessionFromPeerKey,
  ]);

  const joinWithInvite = useCallback(
    async (inviteCode: string, hostPublicKey?: string) => {
      setError(null);
      setCameraMode(null);
      hangingUpRef.current = false;
      setPhase("connecting");
      try {
        const normalized = normalizeHomeChatCode(inviteCode);
        if (!isHomeChatCode(normalized)) {
          throw new Error("That Home Chat code isn’t valid.");
        }
        const { publicKey } = await ensureKeys();
        const room = await joinHomeChatRoom({
          code: normalized,
          publicKey,
        });
        const peerKey = hostPublicKey || room.host_public_key;
        if (!peerKey) throw new Error("The host pairing key is missing.");
        await setSessionFromPeerKey(peerKey);
        setCode(normalized);
        setPhase("connecting");
        await connectPeer("guest", room.id);
      } catch (err) {
        await hangUp();
        setPhase("idle");
        setError(err instanceof Error ? err.message : "Could not join Home Chat.");
      }
    },
    [connectPeer, ensureKeys, hangUp, setSessionFromPeerKey],
  );

  const sendText = useCallback(async () => {
    const body = draft.trim();
    if (!body) return;
    if (body.length > MAX_TEXT_CHARS) {
      setError("That message is too long.");
      return;
    }
    const id = crypto.randomUUID();
    await sendControl({ v: 1, type: "text", id, body });
    setThread((items) => [
      ...items,
      { id, kind: "text", from: "me", body, reactions: [] },
    ]);
    setDraft("");
  }, [draft, sendControl]);

  const sendPhoto = useCallback(
    async (video: HTMLVideoElement) => {
      const sessionKey = sessionKeyRef.current;
      if (!sessionKey) {
        setError("Nearby link is not ready.");
        return;
      }
      try {
        const plain = await captureFrameToJpeg(video);
        setCameraMode(null);
        const id = crypto.randomUUID();
        const sealed = await encryptBytes(sessionKey, plain);
        wipeBytes(plain);
        await sendControl({
          v: 1,
          type: "photo-meta",
          id,
          mime: "image/jpeg",
          byteLength: sealed.byteLength,
          oneTime: true,
        });
        for (const frame of splitPhotoChunks(id, sealed)) {
          await sendControl(frame);
        }
        wipeBytes(sealed);
        await sendControl({ v: 1, type: "photo-end", id });
        setThread((items) => [
          ...items,
          { id, kind: "photo", from: "me", state: "sent", reactions: [] },
        ]);
      } catch (err) {
        setCameraMode(null);
        setError(
          describeHomeChatError(err, "Could not send that photo. Try again."),
        );
      }
    },
    [sendControl],
  );

  const openPhoto = useCallback(async (id: string) => {
    const bytes = await consumeOneTimePhoto(id);
    if (!bytes) {
      setThread((items) =>
        items.map((item) =>
          item.id === id && item.kind === "photo"
            ? { ...item, state: "removed" }
            : item,
        ),
      );
      return;
    }
    setViewingPhoto({ id, bytes });
  }, []);

  const closePhoto = useCallback(async () => {
    const current = viewingPhoto;
    setViewingPhoto(null);
    if (!current) return;
    wipeBytes(current.bytes);
    setThread((items) =>
      items.map((item) =>
        item.id === current.id && item.kind === "photo"
          ? { ...item, state: "removed" }
          : item,
      ),
    );
    try {
      await sendControl({ v: 1, type: "viewed", id: current.id });
    } catch {
      // Link may already be gone; the photo is still wiped locally.
    }
  }, [sendControl, viewingPhoto]);

  const scanFrame = useCallback(
    async (video: HTMLVideoElement) => {
      const { detectInviteFromVideo } = await import("@/lib/home-chat/qr");
      const invite = await detectInviteFromVideo(video);
      if (invite) {
        await joinWithInvite(invite.code, invite.publicKey);
      }
    },
    [joinWithInvite],
  );

  const sendReaction = useCallback(
    async (id: string, emoji: string) => {
      const item = thread.find((row) => row.id === id);
      if (!item) return;
      const mine = item.reactions.find((row) => row.from === "me");
      const nextEmoji = mine?.emoji === emoji ? "" : emoji;
      setThread((items) =>
        items.map((row) =>
          row.id === id
            ? { ...row, reactions: upsertReaction(row.reactions, "me", nextEmoji) }
            : row,
        ),
      );
      try {
        await sendControl({ v: 1, type: "react", id, emoji: nextEmoji });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not send that reaction.",
        );
      }
    },
    [sendControl, thread],
  );

  const joinFromBluetooth = useCallback(async () => {
    setError(null);
    try {
      const raw = await requestNearbyHomeChatDevice();
      const invite = raw ? parseHomeChatInvite(raw) : null;
      if (invite) {
        await joinWithInvite(invite.code, invite.publicKey);
        return;
      }
      setError("No Home Chat beacon found. Use the QR or type the code.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bluetooth pairing didn’t complete.");
    }
  }, [joinWithInvite]);

  return {
    phase,
    error,
    resetError,
    code,
    joinCode,
    setJoinCode,
    qrUrl,
    fingerprint,
    peerName,
    thread,
    draft,
    setDraft,
    cameraMode,
    setCameraMode,
    viewingPhoto,
    bluetooth,
    bluetoothNote,
    startHost,
    hangUp,
    sendText,
    sendPhoto,
    sendReaction,
    openPhoto,
    closePhoto,
    scanFrame,
    joinWithInvite,
    joinFromBluetooth,
    fail: (message: string) => setError(message),
  };
}
