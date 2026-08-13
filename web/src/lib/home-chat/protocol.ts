import { b64UrlToBytes, bytesToB64Url } from "@/lib/home-chat/crypto";

export const HOME_CHAT_PROTOCOL_VERSION = 1;
export const PHOTO_CHUNK_SIZE = 12_000;
export const MAX_PHOTO_BYTES = 1_200_000;
export const MAX_TEXT_CHARS = 2_000;

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
    }
  | { v: 1; type: "photo-end"; id: string }
  | { v: 1; type: "viewed"; id: string }
  | { v: 1; type: "ack"; id: string }
  | { v: 1; type: "bye" };

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

export function parseControl(raw: string): ControlMessage {
  const parsed = JSON.parse(raw) as ControlMessage;
  if (!parsed || parsed.v !== HOME_CHAT_PROTOCOL_VERSION || !parsed.type) {
    throw new Error("Unknown Home Chat message.");
  }
  return parsed;
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
