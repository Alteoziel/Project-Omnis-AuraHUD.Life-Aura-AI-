import {
  bytesToArrayBuffer,
  wipeBytes,
} from "@/lib/home-chat/crypto";

const HKDF_SALT = new TextEncoder().encode("aurahud-home-chat-ratchet-v2");
const WIRE_VERSION = 2;
const GCM_IV_LENGTH = 12;
const COUNTER_LENGTH = 4;
const CHAIN_LENGTH = 32;
const MSG_KEY_LENGTH = 32;
const HEADER_LENGTH = 1 + COUNTER_LENGTH;
const MAX_SKIP = 32;

export class HomeChatRatchet {
  private sendChain: Uint8Array;
  private recvChain: Uint8Array;
  private sendN = 0;
  private recvN = 0;
  private closed = false;

  private constructor(sendChain: Uint8Array, recvChain: Uint8Array) {
    this.sendChain = sendChain;
    this.recvChain = recvChain;
  }

  static async fromSharedSecret(
    shared: Uint8Array,
    role: "host" | "guest",
  ): Promise<HomeChatRatchet> {
    const hostSend = await hkdf(shared, "host-send", CHAIN_LENGTH);
    const guestSend = await hkdf(shared, "guest-send", CHAIN_LENGTH);
    if (role === "host") {
      return new HomeChatRatchet(hostSend, guestSend);
    }
    return new HomeChatRatchet(guestSend, hostSend);
  }

  async seal(plaintext: Uint8Array): Promise<Uint8Array> {
    this.assertOpen();
    const n = this.sendN;
    const { key, nextChain } = await stepChain(this.sendChain);
    wipeBytes(this.sendChain);
    this.sendChain = nextChain;
    this.sendN = n + 1;
    const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH));
    const cipher = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: bytesToArrayBuffer(header(n)) },
        key,
        bytesToArrayBuffer(plaintext),
      ),
    );
    const out = new Uint8Array(HEADER_LENGTH + iv.byteLength + cipher.byteLength);
    out.set(header(n), 0);
    out.set(iv, HEADER_LENGTH);
    out.set(cipher, HEADER_LENGTH + iv.byteLength);
    return out;
  }

  async sealText(text: string): Promise<Uint8Array> {
    return this.seal(new TextEncoder().encode(text));
  }

  async open(payload: Uint8Array): Promise<Uint8Array> {
    this.assertOpen();
    if (payload.byteLength < HEADER_LENGTH + GCM_IV_LENGTH + 16) {
      throw new Error("Encrypted payload is too short.");
    }
    if (payload[0] !== WIRE_VERSION) {
      throw new Error("Unsupported Home Chat crypto version.");
    }
    const n = readCounter(payload);
    if (n < this.recvN) {
      throw new Error("Replay of a Home Chat frame.");
    }
    if (n - this.recvN > MAX_SKIP) {
      throw new Error("Home Chat skipped too many frames.");
    }
    while (this.recvN < n) {
      const skipped = await stepChain(this.recvChain);
      wipeBytes(this.recvChain);
      this.recvChain = skipped.nextChain;
      this.recvN += 1;
    }
    const { key, nextChain } = await stepChain(this.recvChain);
    wipeBytes(this.recvChain);
    this.recvChain = nextChain;
    this.recvN = n + 1;
    const iv = payload.slice(HEADER_LENGTH, HEADER_LENGTH + GCM_IV_LENGTH);
    const cipher = payload.slice(HEADER_LENGTH + GCM_IV_LENGTH);
    try {
      return new Uint8Array(
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv, additionalData: bytesToArrayBuffer(header(n)) },
          key,
          bytesToArrayBuffer(cipher),
        ),
      );
    } catch {
      throw new Error("Could not decrypt that Home Chat frame.");
    }
  }

  async openText(payload: Uint8Array): Promise<string> {
    return new TextDecoder().decode(await this.open(payload));
  }

  wipe(): void {
    this.closed = true;
    wipeBytes(this.sendChain);
    wipeBytes(this.recvChain);
    this.sendN = 0;
    this.recvN = 0;
  }

  private assertOpen(): void {
    if (this.closed) throw new Error("Nearby link is not ready.");
  }
}

export async function deriveHomeChatRatchet(input: {
  privateKey: CryptoKey;
  peerPublicKey: CryptoKey;
  role: "host" | "guest";
}): Promise<HomeChatRatchet> {
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: input.peerPublicKey },
      input.privateKey,
      256,
    ),
  );
  try {
    return await HomeChatRatchet.fromSharedSecret(bits, input.role);
  } finally {
    wipeBytes(bits);
  }
}

function header(n: number): Uint8Array {
  const out = new Uint8Array(HEADER_LENGTH);
  out[0] = WIRE_VERSION;
  out[1] = (n >>> 24) & 0xff;
  out[2] = (n >>> 16) & 0xff;
  out[3] = (n >>> 8) & 0xff;
  out[4] = n & 0xff;
  return out;
}

function readCounter(payload: Uint8Array): number {
  return (
    ((payload[1] << 24) | (payload[2] << 16) | (payload[3] << 8) | payload[4]) >>> 0
  );
}

async function hkdf(ikm: Uint8Array, info: string, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    bytesToArrayBuffer(ikm),
    "HKDF",
    false,
    ["deriveBits"],
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: HKDF_SALT,
        info: new TextEncoder().encode(info),
      },
      key,
      length * 8,
    ),
  );
}

async function stepChain(
  chain: Uint8Array,
): Promise<{ key: CryptoKey; nextChain: Uint8Array }> {
  const out = await hkdf(chain, "step", CHAIN_LENGTH + MSG_KEY_LENGTH);
  const nextChain = out.slice(0, CHAIN_LENGTH);
  const msgRaw = out.slice(CHAIN_LENGTH);
  wipeBytes(out);
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      bytesToArrayBuffer(msgRaw),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
    return { key, nextChain };
  } finally {
    wipeBytes(msgRaw);
  }
}
