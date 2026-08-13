import { b64UrlToBytes, bytesToB64Url } from "@/lib/home-chat/crypto";

export const HOME_CHAT_PROTOCOL_VERSION = 1;
// iPhone data channels often cap a message at 16KiB. Chunks are encrypted and
// base64'd twice, so keep the plaintext slice well under that.
export const PHOTO_CHUNK_SIZE = 1_500;
export const MAX_PHOTO_BYTES = 1_200_000;
export const MAX_TEXT_CHARS = 2_000;
export const MAX_QUEUED_PHOTOS = 8;
/** iPhone data channels often cap one message — and the whole send buffer — at 16KiB. */
export const MAX_DATA_CHANNEL_BYTES = 12_000;

export type HomeChatRole = "host" | "guest";

export type ControlMessage =
  | { v: 1; type: "hello"; publicKey: string; displayName: string }
  | { v: 1; type: "text"; id: string; body: string }
  | {
      v: 1;
      type: "photo-meta";
      id: string;
      mime: "image/jpeg";
      byteLength: number;
      oneTime: true;
      key: string;
    }
  | { v: 1; type: "photo-end"; id: string }
  | { v: 1; type: "viewed"; id: string }
  | { v: 1; type: "ack"; id: string }
  | { v: 1; type: "bye" }
  | { v: 1; type: "react"; id: string; emoji: string };

const CONTROL_TYPES = new Set([
  "hello",
  "text",
  "photo-meta",
  "photo-end",
  "viewed",
  "ack",
  "bye",
  "react",
]);

export type PhotoChunkHeader = {
  v: 1;
  type: "photo-chunk";
  id: string;
  index: number;
  total: number;
};

export function encodeControl(message: ControlMessage): string {
  return JSON.stringify(message);
}

export function parseControl(raw: string): ControlMessage | null {
  const parsed = JSON.parse(raw) as { v?: number; type?: string; id?: string; emoji?: string };
  if (!parsed || parsed.v !== HOME_CHAT_PROTOCOL_VERSION || typeof parsed.type !== "string") {
    throw new Error("Unknown Home Chat message.");
  }
  if (!CONTROL_TYPES.has(parsed.type)) return null;
  if (parsed.type === "react") {
    if (typeof parsed.id !== "string" || !parsed.id) {
      throw new Error("Invalid reaction.");
    }
    const emoji = typeof parsed.emoji === "string" ? parsed.emoji : "";
    if (emoji.length > 16) {
      throw new Error("Reaction is too long.");
    }
    return { v: 1, type: "react", id: parsed.id, emoji };
  }
  if (parsed.type === "photo-meta") {
    const key = "key" in parsed ? parsed.key : null;
    if (typeof parsed.id !== "string" || !parsed.id || typeof key !== "string" || !key) {
      throw new Error("Photo is missing its one-time key.");
    }
  }
  return parsed as ControlMessage;
}

export function splitPhotoChunks(id: string, ciphertext: Uint8Array): string[] {
  if (ciphertext.byteLength === 0) {
    throw new Error("Photo is empty.");
  }
  if (ciphertext.byteLength > MAX_PHOTO_BYTES) {
    throw new Error("Photo is too large to send nearby.");
  }
  const total = Math.ceil(ciphertext.byteLength / PHOTO_CHUNK_SIZE);
  const frames: string[] = [];
  for (let index = 0; index < total; index += 1) {
    const start = index * PHOTO_CHUNK_SIZE;
    const slice = ciphertext.slice(start, start + PHOTO_CHUNK_SIZE);
    const header: PhotoChunkHeader = {
      v: 1,
      type: "photo-chunk",
      id,
      index,
      total,
    };
    frames.push(`${JSON.stringify(header)}\n${bytesToB64Url(slice)}`);
  }
  return frames;
}

export function parsePhotoChunk(raw: string): {
  header: PhotoChunkHeader;
  bytes: Uint8Array;
} {
  const splitAt = raw.indexOf("\n");
  if (splitAt <= 0) {
    throw new Error("Invalid photo chunk.");
  }
  const header = JSON.parse(raw.slice(0, splitAt)) as PhotoChunkHeader;
  if (
    header?.v !== 1 ||
    header.type !== "photo-chunk" ||
    !header.id ||
    !Number.isInteger(header.index) ||
    !Number.isInteger(header.total)
  ) {
    throw new Error("Invalid photo chunk header.");
  }
  return { header, bytes: b64UrlToBytes(raw.slice(splitAt + 1)) };
}

export function assemblePhotoChunks(
  total: number,
  chunks: Map<number, Uint8Array>,
): Uint8Array {
  if (chunks.size !== total) {
    throw new Error("Photo is incomplete.");
  }
  let byteLength = 0;
  for (let i = 0; i < total; i += 1) {
    const part = chunks.get(i);
    if (!part) throw new Error("Photo is missing a chunk.");
    byteLength += part.byteLength;
  }
  if (byteLength > MAX_PHOTO_BYTES) {
    throw new Error("Photo is too large.");
  }
  const out = new Uint8Array(byteLength);
  let offset = 0;
  for (let i = 0; i < total; i += 1) {
    const part = chunks.get(i)!;
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

export function isControlRaw(raw: string): boolean {
  return raw.startsWith("{") && !raw.includes("\n");
}

export function isHomeChatQuotaError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String(err.name) : "";
  const message = "message" in err ? String(err.message) : "";
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    /quota has been exceeded/i.test(message) ||
    /nearby link is busy/i.test(message)
  );
}

export function describeHomeChatError(err: unknown, fallback: string): string {
  if (isHomeChatQuotaError(err)) {
    return "This nearby link is too busy for that photo. Stay in the chat and try again.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
