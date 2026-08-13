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

export type HomeChatPeerHandlers = {
  onMessage: (data: string) => void;
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

  send(text: string): void {
    if (!this.channel || this.channel.readyState !== "open") {
      throw new Error("Nearby link is not connected yet.");
    }
    const max =
      this.channel.maxMessageSize && this.channel.maxMessageSize > 0
        ? this.channel.maxMessageSize
        : 16_384;
    if (new TextEncoder().encode(text).byteLength > max) {
      throw new Error("That photo is too large for this nearby link.");
    }
    this.channel.send(text);
  }

  async sendWhenReady(text: string): Promise<void> {
    await this.waitForBuffer();
    this.send(text);
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
    channel.bufferedAmountLowThreshold = 32_000;
    channel.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        this.handlers.onMessage(event.data);
      }
    });
    channel.addEventListener("open", () => {
      this.handlers.onState("channel-open");
    });
  }

  private waitForBuffer(): Promise<void> {
    const channel = this.channel;
    if (!channel || channel.readyState !== "open") {
      return Promise.reject(new Error("Nearby link is not connected yet."));
    }
    if (channel.bufferedAmount < 96_000) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        channel.removeEventListener("bufferedamountlow", onLow);
        reject(new Error("Nearby link is busy. Try the photo again."));
      }, 8_000);
      const onLow = () => {
        window.clearTimeout(timer);
        channel.removeEventListener("bufferedamountlow", onLow);
        resolve();
      };
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
