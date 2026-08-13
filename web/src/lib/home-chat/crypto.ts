const CURVE = { name: "ECDH", namedCurve: "P-256" } as const;
const HKDF_SALT = new TextEncoder().encode("aurahud-home-chat-v1");
const HKDF_INFO = new TextEncoder().encode("aes-256-gcm");
const GCM_IV_LENGTH = 12;
const VERSION = 1;

export type HomeChatKeyPair = {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
};

function bytesToB64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(`${padded}${pad}`);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export async function generateHomeChatKeyPair(): Promise<HomeChatKeyPair> {
  const pair = await crypto.subtle.generateKey(CURVE, true, ["deriveBits"]);
  return { publicKey: pair.publicKey, privateKey: pair.privateKey };
}

export async function exportPublicKeyB64(publicKey: CryptoKey): Promise<string> {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", publicKey));
  return bytesToB64Url(raw);
}

export async function importPublicKeyB64(value: string): Promise<CryptoKey> {
  const raw = b64UrlToBytes(value);
  if (raw.byteLength !== 65) {
    throw new Error("Invalid Home Chat public key.");
  }
  return crypto.subtle.importKey("raw", raw, CURVE, true, []);
}

export async function deriveSessionKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey,
): Promise<CryptoKey> {
  const bits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: peerPublicKey },
    privateKey,
    256,
  );
  const ikm = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: HKDF_SALT,
      info: HKDF_INFO,
    },
    ikm,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBytes(
  sessionKey: CryptoKey,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sessionKey, plaintext),
  );
  const out = new Uint8Array(1 + iv.byteLength + cipher.byteLength);
  out[0] = VERSION;
  out.set(iv, 1);
  out.set(cipher, 1 + iv.byteLength);
  return out;
}

export async function decryptBytes(
  sessionKey: CryptoKey,
  payload: Uint8Array,
): Promise<Uint8Array> {
  if (payload.byteLength < 1 + GCM_IV_LENGTH + 16) {
    throw new Error("Encrypted payload is too short.");
  }
  if (payload[0] !== VERSION) {
    throw new Error("Unsupported Home Chat crypto version.");
  }
  const iv = payload.slice(1, 1 + GCM_IV_LENGTH);
  const cipher = payload.slice(1 + GCM_IV_LENGTH);
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv }, sessionKey, cipher),
  );
}

export async function encryptText(
  sessionKey: CryptoKey,
  text: string,
): Promise<Uint8Array> {
  return encryptBytes(sessionKey, new TextEncoder().encode(text));
}

export async function decryptText(
  sessionKey: CryptoKey,
  payload: Uint8Array,
): Promise<string> {
  return new TextDecoder().decode(await decryptBytes(sessionKey, payload));
}

/** Short shared fingerprint so both phones can confirm they matched. */
export async function pairingFingerprint(
  publicKeyA: string,
  publicKeyB: string,
): Promise<string> {
  const [left, right] = [publicKeyA, publicKeyB].sort();
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${left}:${right}`),
    ),
  );
  const hex = Array.from(digest.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

export function wipeBytes(bytes: Uint8Array): void {
  if (bytes.byteLength === 0) return;
  crypto.getRandomValues(bytes);
  bytes.fill(0);
}

export { bytesToB64Url, b64UrlToBytes };
