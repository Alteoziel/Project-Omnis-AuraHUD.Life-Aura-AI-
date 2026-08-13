export type LinkPathKind = "direct" | "stun" | "relay" | "unknown";

export type LinkHop = {
  id: string;
  title: string;
  detail: string;
  tone: "ok" | "warn" | "muted";
};

export type LinkReport = {
  pathKind: LinkPathKind;
  pathLabel: string;
  localType: string | null;
  remoteType: string | null;
  localAddress: string | null;
  remoteAddress: string | null;
  dtls: string | null;
  ice: string | null;
  channelState: string | null;
  messagesSent: number | null;
  messagesReceived: number | null;
  extraDataChannels: boolean;
  extraRemoteAddresses: boolean;
  hasMediaTracks: boolean;
  hops: LinkHop[];
  warning: string | null;
};

export type StatsLike = {
  id?: string;
  type: string;
  [key: string]: unknown;
};

export function maskEndpoint(address: string | null | undefined): string | null {
  if (!address) return null;
  const trimmed = address.replace(/^\[|\]$/g, "");
  if (trimmed.includes(":")) return "IPv6 on this network";
  const parts = trimmed.split(".");
  if (parts.length === 4 && parts.every((part) => /^\d+$/.test(part))) {
    return `${parts[0]}.${parts[1]}.×.×`;
  }
  return "on this network";
}

export function pathKindFromCandidates(
  localType: string | null,
  remoteType: string | null,
): LinkPathKind {
  const types = [localType, remoteType].map((value) => (value ?? "").toLowerCase());
  if (types.includes("relay")) return "relay";
  if (types.includes("srflx") || types.includes("prflx")) return "stun";
  if (types.includes("host")) return "direct";
  return "unknown";
}

export function pathLabelFor(kind: LinkPathKind): string {
  if (kind === "direct") return "Direct · same Wi-Fi";
  if (kind === "stun") return "Through the internet";
  if (kind === "relay") return "Through a relay";
  return "Link path unknown";
}

function asRecord(value: StatsLike): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function pickSelectedPair(stats: StatsLike[]): StatsLike | null {
  const byId = new Map(stats.filter((row) => row.id).map((row) => [String(row.id), row]));
  const transport = stats.find((row) => row.type === "transport");
  const selectedId = transport ? asRecord(transport).selectedCandidatePairId : null;
  if (typeof selectedId === "string" && byId.get(selectedId)) {
    return byId.get(selectedId) ?? null;
  }
  const nominated = stats.find((row) => {
    if (row.type !== "candidate-pair") return false;
    const rec = asRecord(row);
    return rec.nominated === true || rec.selected === true;
  });
  if (nominated) return nominated;
  return (
    stats.find((row) => row.type === "candidate-pair" && asRecord(row).state === "succeeded") ??
    null
  );
}

function candidateType(row: StatsLike | undefined): string | null {
  if (!row) return null;
  const rec = asRecord(row);
  return typeof rec.candidateType === "string" ? rec.candidateType : null;
}

function candidateAddress(row: StatsLike | undefined): string | null {
  if (!row) return null;
  const rec = asRecord(row);
  const value = rec.address ?? rec.ip ?? rec.ipAddress;
  return typeof value === "string" ? value : null;
}

export function buildLinkReport(input: {
  stats: Iterable<StatsLike>;
  channelState: string | null;
  dataChannelCount: number;
  mediaTrackCount: number;
}): LinkReport {
  const stats = [...input.stats];
  const byId = new Map(stats.filter((row) => row.id).map((row) => [String(row.id), row]));
  const pair = pickSelectedPair(stats);
  const pairRec = pair ? asRecord(pair) : null;
  const local = pairRec?.localCandidateId
    ? byId.get(String(pairRec.localCandidateId))
    : undefined;
  const remote = pairRec?.remoteCandidateId
    ? byId.get(String(pairRec.remoteCandidateId))
    : undefined;
  const localType = candidateType(local);
  const remoteType = candidateType(remote);
  const pathKind = pathKindFromCandidates(localType, remoteType);
  const transport = stats.find((row) => row.type === "transport");
  const transportRec = transport ? asRecord(transport) : null;
  const channels = stats.filter((row) => row.type === "data-channel");
  const primaryChannel = channels[0] ? asRecord(channels[0]) : null;
  const remoteAddresses = new Set(
    stats
      .filter((row) => row.type === "remote-candidate")
      .map((row) => candidateAddress(row))
      .filter((value): value is string => Boolean(value)),
  );
  const extraDataChannels = input.dataChannelCount > 1 || channels.length > 1;
  // Same-Wi-Fi phones often advertise host IPv4, IPv6, and a STUN address.
  // Only flag a crowd of remote endpoints — three is normal, not a tap.
  const extraRemoteAddresses = remoteAddresses.size > 8;
  const hasMediaTracks = input.mediaTrackCount > 0;
  const messagesSent =
    typeof primaryChannel?.messagesSent === "number" ? primaryChannel.messagesSent : null;
  const messagesReceived =
    typeof primaryChannel?.messagesReceived === "number"
      ? primaryChannel.messagesReceived
      : null;
  const dtls = typeof transportRec?.dtlsState === "string" ? transportRec.dtlsState : null;
  const ice = typeof transportRec?.iceState === "string" ? transportRec.iceState : null;

  let warning: string | null = null;
  if (hasMediaTracks) {
    warning = "This link has a media track. Home Chat should only use the encrypted data channel.";
  } else if (extraDataChannels) {
    warning = "More than one data channel is open on this link.";
  } else if (extraRemoteAddresses) {
    warning = "Several remote network addresses are offering a path. That can be normal on Wi-Fi, or a sign extra devices are probing.";
  } else if (pathKind === "relay") {
    warning = "This chat is going through a relay instead of straight to the other phone.";
  }

  const hops: LinkHop[] = [
    {
      id: "you",
      title: "This device",
      detail: "Text and photos are encrypted here first (AES-256-GCM).",
      tone: "ok",
    },
    {
      id: "link",
      title: pathLabelFor(pathKind),
      detail:
        pathKind === "direct"
          ? "The encrypted nearby link is device-to-device on this Wi-Fi. Chat bodies do not go through AuraHUD’s server."
          : pathKind === "stun"
            ? "The encrypted nearby link is still device-to-device, using public addresses. Chat bodies still do not go through AuraHUD’s server."
            : pathKind === "relay"
              ? "The encrypted nearby link is bouncing through a relay. Chat bodies are still encrypted, but this is not the usual same-Wi-Fi path."
              : "Waiting for the nearby link to report its path.",
      tone: pathKind === "relay" ? "warn" : pathKind === "unknown" ? "muted" : "ok",
    },
    {
      id: "them",
      title: "Their device",
      detail: "Only frames that decrypt with your pairing key can appear in this thread.",
      tone: "ok",
    },
    {
      id: "server",
      title: "AuraHUD server (pairing only)",
      detail: "Used for the code/QR handshake, not for message or photo bodies.",
      tone: "muted",
    },
  ];

  return {
    pathKind,
    pathLabel: pathLabelFor(pathKind),
    localType,
    remoteType,
    localAddress: maskEndpoint(candidateAddress(local)),
    remoteAddress: maskEndpoint(candidateAddress(remote)),
    dtls,
    ice,
    channelState: input.channelState,
    messagesSent,
    messagesReceived,
    extraDataChannels,
    extraRemoteAddresses,
    hasMediaTracks,
    hops,
    warning,
  };
}

export type ScreenWatch = {
  inFront: boolean;
  label: string;
  detail: string;
};

export function describeScreenWatch(input: {
  visible: boolean;
  focused: boolean;
}): ScreenWatch {
  if (!input.visible) {
    return {
      inFront: false,
      label: "Chat is in the background",
      detail:
        "This tab is hidden. The app cannot see a hidden camera, a person behind you, or a system screen recorder.",
    };
  }
  if (!input.focused) {
    return {
      inFront: false,
      label: "Chat is not in front",
      detail:
        "Another window is focused. This is not a spy detector — it only knows whether Home Chat is the front tab.",
    };
  }
  return {
    inFront: true,
    label: "This chat is in front",
    detail:
      "Browsers cannot tell if someone is watching the glass, mirroring the phone, or recording the OS. This only means Home Chat is the front tab on this device.",
  };
}
