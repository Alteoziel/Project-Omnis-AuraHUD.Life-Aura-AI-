import { wipeBytes } from "@/lib/home-chat/crypto";
import { MAX_PHOTO_BYTES } from "@/lib/home-chat/protocol";

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;

export async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

export async function bytesToJpegBlob(bytes: Uint8Array): Promise<Blob> {
  const copy = bytes.slice();
  return new Blob([copy], { type: "image/jpeg" });
}

/**
 * Capture the current camera frame into a JPEG that never touches the Photos library.
 * Uses an in-memory canvas only — no file input, no download, no share sheet.
 */
export async function captureFrameToJpeg(
  video: HTMLVideoElement,
): Promise<Uint8Array> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error("Camera is not ready yet.");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("Could not capture a photo.");
  ctx.drawImage(video, 0, 0, targetW, targetH);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => {
        if (next) resolve(next);
        else reject(new Error("Could not encode the photo."));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
  ctx.clearRect(0, 0, targetW, targetH);
  canvas.width = 0;
  canvas.height = 0;
  const bytes = await blobToBytes(blob);
  if (bytes.byteLength > MAX_PHOTO_BYTES) {
    wipeBytes(bytes);
    throw new Error("That photo is too large. Move closer and try again.");
  }
  return bytes;
}

export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

export async function openInAppCamera(
  facingMode: "environment" | "user" = "environment",
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This device cannot open an in-app camera.");
  }
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 1280 },
    },
  });
}
