import { bytesToArrayBuffer } from "@/lib/home-chat/crypto";
import { buildLinkReport } from "@/lib/home-chat/link-report";
import {
  describeHomeChatError,
  isHomeChatQuotaError,
  MAX_DATA_CHANNEL_BYTES,
} from "@/lib/home-chat/protocol";
import {
  appendHomeChatSignal,
  fetchHomeChatRoom,
  homeChatChannelName,
  type HomeChatSignal,
} from "@/lib/home-chat/signaling";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.l.google.com:19302" },
];

// iPhone SCTP buffers are tiny. Wait until almost empty before each frame.
const SEND_HIGH_WATER = 2_048;
const SEND_LOW_WATER = 1_024;

export type HomeChatPeerHandlers = {
  onMessage: (data: string | Uint8Array) => void;
  onState: (state: RTCPeerConnectionState | "channel-open") => void;
};

export class HomeChatPeer {
  readonly role: "host" | "guest";
  readonly roomId: string;
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private signalChannel: RealtimeChannel | null = null;
  private handlers: HomeChatPeerHandlers;
  private closed = false;
  private seen = new Set<string>();
  private pendingIce: RTCIceCandidateInit[] = [];
  private pollTimer: number | null = null;
  private sendChain: Promise<void> = Promise.resolve();

  constructor(input: {
    role: "host" | "guest";
    roomId: string;
    handlers: HomeChatPeerHandlers;
  }) {
    this.role = input.role;
    this.roomId = input.roomId;
    this.handlers = input.handlers;
  }

  get connected(): boolean {
    return this.channel?.readyState === "open";
  }

  async inspectLink() {
    const pc = this.pc;
    const stats = pc ? [...(await pc.getStats()).values()] : [];
    const mediaTrackCount = pc
      ? [...pc.getSenders(), ...pc.getReceivers()].filter((item) => item.track).length
      : 0;
    const dataChannelCount = stats.filter((row) => row.type === "data-channel").length ||
      (this.channel ? 1 : 0);
    return buildLinkReport({
      stats,
      channelState: this.channel?.readyState ?? null,
      dataChannelCount,
      mediaTrackCount,
    });
  }

  async start(): Promise<void> {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 8,
    });
    this.pc = pc;

    pc.addEventListener("connectionstatechange", () => {
      this.handlers.onState(pc.connectionState);
    });

    pc.addEventListener("icecandidate", (event) => {
      if (!event.candidate) return;
      void this.sendSignal({
        kind: "ice",
        from: this.role,
        payload: JSON.stringify(event.candidate),
        at: Date.now(),
      });
    });

    if (this.role === "host") {
      this.bindDataChannel(pc.createDataChannel("home-chat", { ordered: true }));
    } else {
      pc.addEventListener("datachannel", (event) => {
        this.bindDataChannel(event.channel);
      });
    }

    await this.subscribeSignals();
    this.startPolling();

    if (this.role === "host") {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await this.sendSignal({
        kind: "offer",
        from: "host",
        payload: JSON.stringify(pc.localDescription),
        at: Date.now(),
      });
    }
  }

  send(data: string | Uint8Array): void {
    if (!this.channel || this.channel.readyState !== "open") {
      throw new Error("Nearby link is not connected yet.");
    }
    const advertisedMax = (this.channel as RTCDataChannel & { maxMessageSize?: number })
      .maxMessageSize;
    const advertised =
      typeof advertisedMax === "number" && advertisedMax > 0 ? advertisedMax : 16_384;
    const max = Math.min(advertised, MAX_DATA_CHANNEL_BYTES);
    const payload =
      typeof data === "string" ? data : bytesToArrayBuffer(data);
    // Safari counts data-channel strings as UTF-16 (2 bytes per char).
    const size =
      typeof payload === "string" ? payload.length * 2 : payload.byteLength;
    if (size > max) {
      throw new Error("That photo is too large for this nearby link.");
    }
    try {
      if (typeof payload === "string") this.channel.send(payload);
      else this.channel.send(payload);
    } catch (err) {
      if (isHomeChatQuotaError(err)) throw err;
      throw new Error(describeHomeChatError(err, "Could not send on the nearby link."));
    }
  }

  async sendWhenReady(data: string | Uint8Array): Promise<void> {
    const run = async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        if (this.closed) {
          throw new Error("Nearby link is not connected yet.");
        }
        await this.waitUntilBuffered(attempt === 0 ? SEND_HIGH_WATER : 0);
        try {
          this.send(data);
          return;
        } catch (err) {
          lastError = err;
          if (!isHomeChatQuotaError(err)) {
            throw err;
          }
          await delay(40 * (attempt + 1));
        }
      }
      throw new Error(
        describeHomeChatError(
          lastError,
          "This nearby link is too busy for that photo. Stay in the chat and try again.",
        ),
      );
    };
    const next = this.sendChain.then(run, run);
    this.sendChain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.pollTimer != null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.channel?.close();
    this.channel = null;
    this.pc?.close();
    this.pc = null;
    if (this.signalChannel) {
      const supabase = createClient();
      await supabase.removeChannel(this.signalChannel);
      this.signalChannel = null;
    }
  }

  private bindDataChannel(channel: RTCDataChannel): void {
    this.channel = channel;
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = SEND_LOW_WATER;
    channel.addEventListener("message", (event) => {
      void this.dispatchMessage(event.data);
    });
    channel.addEventListener("open", () => {
      this.handlers.onState("channel-open");
    });
  }

  private async dispatchMessage(data: unknown): Promise<void> {
    // iPhone Safari often delivers binary data-channel messages as Blob even
    // when binaryType is "arraybuffer". Dropping those looks like "sent, never
    // received."
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      const bytes = new Uint8Array(await data.arrayBuffer());
      this.handlers.onMessage(bytes);
      return;
    }
    const payload = decodeChannelData(data);
    if (payload) this.handlers.onMessage(payload);
  }

  private waitUntilBuffered(maxAmount: number): Promise<void> {
    const channel = this.channel;
    if (!channel || channel.readyState !== "open") {
      return Promise.reject(new Error("Nearby link is not connected yet."));
    }
    if (channel.bufferedAmount <= maxAmount) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const finish = (err?: Error) => {
        window.clearInterval(poll);
        window.clearTimeout(timer);
        channel.removeEventListener("bufferedamountlow", onLow);
        if (err) reject(err);
        else resolve();
      };
      const onLow = () => {
        if (channel.bufferedAmount <= maxAmount) finish();
      };
      const poll = window.setInterval(() => {
        if (this.closed || channel.readyState !== "open") {
          finish(new Error("Nearby link is not connected yet."));
          return;
        }
        if (channel.bufferedAmount <= maxAmount) finish();
      }, 16);
      const timer = window.setTimeout(() => {
        finish(new Error("Nearby link is busy. Try the photo again."));
      }, 12_000);
      channel.addEventListener("bufferedamountlow", onLow);
    });
  }

  private signalKey(signal: HomeChatSignal): string {
    return `${signal.from}:${signal.kind}:${signal.at}:${signal.payload.slice(0, 24)}`;
  }

  private async subscribeSignals(): Promise<void> {
    const supabase = createClient();
    const channel = supabase.channel(homeChatChannelName(this.roomId), {
      config: {
        private: true,
        broadcast: { self: false },
      },
    });
    this.signalChannel = channel;
    channel.on("broadcast", { event: "signal" }, (message) => {
      const signal = message.payload as HomeChatSignal | undefined;
      if (!signal || signal.from === this.role) return;
      void this.handleSignal(signal);
    });
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject(new Error("Could not open the Home Chat pairing channel."));
        }
      });
    });
  }

  private startPolling(): void {
    this.pollTimer = window.setInterval(() => {
      void this.pollSignals();
    }, 1200);
    void this.pollSignals();
  }

  private async pollSignals(): Promise<void> {
    if (this.closed || this.connected) return;
    try {
      const room = await fetchHomeChatRoom(this.roomId);
      if (!room) return;
      const incoming = this.role === "host" ? room.guest_signal : room.host_signal;
      for (const signal of incoming ?? []) {
        if (signal.from === this.role) continue;
        await this.handleSignal(signal);
      }
    } catch {
      // Keep trying until the nearby link connects or the user hangs up.
    }
  }

  private async sendSignal(signal: HomeChatSignal): Promise<void> {
    if (this.closed) return;
    this.seen.add(this.signalKey(signal));
    await appendHomeChatSignal({
      roomId: this.roomId,
      role: this.role,
      signal,
    });
    await this.signalChannel?.send({
      type: "broadcast",
      event: "signal",
      payload: signal,
    });
  }

  private async handleSignal(signal: HomeChatSignal): Promise<void> {
    const key = this.signalKey(signal);
    if (this.seen.has(key)) return;
    this.seen.add(key);
    const pc = this.pc;
    if (!pc || this.closed) return;

    if (signal.kind === "offer" && this.role === "guest") {
      await pc.setRemoteDescription(JSON.parse(signal.payload) as RTCSessionDescriptionInit);
      await this.flushIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await this.sendSignal({
        kind: "answer",
        from: "guest",
        payload: JSON.stringify(pc.localDescription),
        at: Date.now(),
      });
      return;
    }
    if (signal.kind === "answer" && this.role === "host") {
      if (!pc.currentRemoteDescription) {
        await pc.setRemoteDescription(
          JSON.parse(signal.payload) as RTCSessionDescriptionInit,
        );
        await this.flushIce();
      }
      return;
    }
    if (signal.kind === "ice") {
      const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
      if (!pc.remoteDescription) {
        this.pendingIce.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore stale candidates after hangup.
      }
    }
  }

  private async flushIce(): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    const queued = this.pendingIce;
    this.pendingIce = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore candidates that arrived for an older generation.
      }
    }
  }
}

function decodeChannelData(data: unknown): string | Uint8Array | null {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const copy = new Uint8Array(view.byteLength);
    copy.set(view);
    return copy;
  }
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
