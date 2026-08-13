import { bytesToArrayBuffer, wipeBytes } from "@/lib/home-chat/crypto";
import { MAX_PHOTO_BYTES } from "@/lib/home-chat/protocol";

const MAX_EDGE = 720;
const JPEG_QUALITY = 0.55;

export async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function jpegDataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const binary = atob(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export async function bytesToJpegBlob(bytes: Uint8Array): Promise<Blob> {
  return new Blob([bytesToArrayBuffer(bytes)], { type: "image/jpeg" });
}

export type GrabbedCameraFrame = {
  previewUrl: string | null;
  encodeJpeg: () => Promise<Uint8Array>;
};

function wipeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null) {
  ctx?.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;
}

function previewDataUrlFromCanvas(source: HTMLCanvasElement): string | null {
  const max = 96;
  const scale = Math.min(1, max / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  try {
    return canvas.toDataURL("image/jpeg", 0.45);
  } catch {
    return null;
  } finally {
    wipeCanvas(canvas, ctx);
  }
}

async function encodeCanvasToJpeg(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): Promise<Uint8Array> {
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (next) => {
          if (next && next.size > 0) {
            resolve(next);
            return;
          }
          try {
            const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
            resolve(
              new Blob([bytesToArrayBuffer(jpegDataUrlToBytes(dataUrl))], {
                type: "image/jpeg",
              }),
            );
          } catch {
            reject(new Error("Could not encode the photo."));
          }
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    });
    const bytes = await blobToBytes(blob);
    if (bytes.byteLength > MAX_PHOTO_BYTES) {
      wipeBytes(bytes);
      throw new Error("That photo is too large. Move closer and try again.");
    }
    return bytes;
  } finally {
    wipeCanvas(canvas, ctx);
  }
}

/**
 * Copy the live camera frame in one paint so the camera overlay can close
 * immediately. JPEG encode and encryption happen after the video is gone.
 */
export function grabCameraFrame(video: HTMLVideoElement): GrabbedCameraFrame {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height || video.readyState < 2) {
    throw new Error("Camera is not ready yet. Hold still and tap again.");
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
  const previewUrl = previewDataUrlFromCanvas(canvas);
  return {
    previewUrl,
    encodeJpeg: () => encodeCanvasToJpeg(canvas, ctx),
  };
}

/**
 * Capture the current camera frame into a JPEG that never touches the Photos library.
 * Uses an in-memory canvas only — no file input, no download, no share sheet.
 */
export async function captureFrameToJpeg(
  video: HTMLVideoElement,
): Promise<Uint8Array> {
  return grabCameraFrame(video).encodeJpeg();
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
  const size = {
    width: { ideal: 1280 },
    height: { ideal: 1280 },
  };
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { ...size, facingMode: { exact: facingMode } },
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { ...size, facingMode: { ideal: facingMode } },
    });
  }
}
