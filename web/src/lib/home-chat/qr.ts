import { parseHomeChatInvite, type HomeChatInvite } from "@/lib/home-chat/invite";

export async function renderInviteQrDataUrl(inviteText: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(inviteText, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 280,
    color: { dark: "#122030", light: "#fcfdff" },
  });
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

function getBarcodeDetector(): BarcodeDetectorLike | null {
  const Ctor = (globalThis as {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }).BarcodeDetector;
  if (!Ctor) return null;
  return new Ctor({ formats: ["qr_code"] });
}

export async function detectInviteFromVideo(
  video: HTMLVideoElement,
): Promise<HomeChatInvite | null> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  const detector = getBarcodeDetector();
  if (detector) {
    try {
      const codes = await detector.detect(video);
      for (const code of codes) {
        const invite = parseHomeChatInvite(code.rawValue ?? "");
        if (invite) return invite;
      }
    } catch {
      // Fall through to jsQR.
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  const image = ctx.getImageData(0, 0, width, height);
  const jsQR = (await import("jsqr")).default;
  const result = jsQR(image.data, width, height, { inversionAttempts: "dontInvert" });
  canvas.width = 0;
  canvas.height = 0;
  if (!result?.data) return null;
  return parseHomeChatInvite(result.data);
}
