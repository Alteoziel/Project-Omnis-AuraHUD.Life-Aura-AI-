import assert from "node:assert/strict";
import {
  generateHomeChatCode,
  isHomeChatCode,
  normalizeHomeChatCode,
} from "@/lib/home-chat/codes";
import {
  decryptBytes,
  decryptText,
  deriveSessionKey,
  encryptBytes,
  encryptText,
  exportPublicKeyB64,
  generateHomeChatKeyPair,
  importPublicKeyB64,
  pairingFingerprint,
  wipeBytes,
  bytesToB64Url,
} from "@/lib/home-chat/crypto";
import { encodeHomeChatInvite, parseHomeChatInvite } from "@/lib/home-chat/invite";
import {
  assemblePhotoChunks,
  describeHomeChatError,
  isHomeChatQuotaError,
  parseControl,
  parsePhotoChunk,
  splitPhotoChunks,
} from "@/lib/home-chat/protocol";
import {
  buildLinkReport,
  describeScreenWatch,
  maskEndpoint,
  pathKindFromCandidates,
  pathLabelFor,
} from "@/lib/home-chat/link-report";
import {
  firstGrapheme,
  normalizeReactionEmoji,
  upsertReaction,
} from "@/lib/home-chat/reactions";

async function main() {
  const fixed = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const code = generateHomeChatCode(() => fixed);
  assert.equal(code.length, 8);
  assert.equal(isHomeChatCode(code), true);
  assert.equal(normalizeHomeChatCode("ab-cd 01"), "ABCDGL");
  assert.equal(isHomeChatCode("BADCODE!"), false);

  const alice = await generateHomeChatKeyPair();
  const bob = await generateHomeChatKeyPair();
  const alicePub = await exportPublicKeyB64(alice.publicKey);
  const bobPub = await exportPublicKeyB64(bob.publicKey);
  const aliceKey = await deriveSessionKey(
    alice.privateKey,
    await importPublicKeyB64(bobPub),
  );
  const bobKey = await deriveSessionKey(
    bob.privateKey,
    await importPublicKeyB64(alicePub),
  );

  const sealed = await encryptText(aliceKey, "hello nearby");
  assert.equal(await decryptText(bobKey, sealed), "hello nearby");

  const photo = new Uint8Array(40_000);
  crypto.getRandomValues(photo);
  const photoSealed = await encryptBytes(aliceKey, photo);
  const opened = await decryptBytes(bobKey, photoSealed);
  assert.equal(opened.byteLength, photo.byteLength);
  assert.deepEqual(Array.from(opened.slice(0, 16)), Array.from(photo.slice(0, 16)));

  const fpA = await pairingFingerprint(alicePub, bobPub);
  const fpB = await pairingFingerprint(bobPub, alicePub);
  assert.equal(fpA, fpB);
  assert.match(fpA, /^[0-9a-f]{4}-[0-9a-f]{4}$/);

  const invite = encodeHomeChatInvite({ code: "ABCD2345", publicKey: alicePub });
  assert.deepEqual(parseHomeChatInvite(invite), {
    code: "ABCD2345",
    publicKey: alicePub,
  });
  assert.equal(parseHomeChatInvite("not-an-invite"), null);

  const chunks = splitPhotoChunks("photo-1", photoSealed);
  assert.ok(chunks.length >= 2);
  for (const frame of chunks) {
    const wire = bytesToB64Url(await encryptText(aliceKey, frame));
    assert.ok(
      wire.length * 2 < 12_000,
      "base64 photo frame must fit Safari's UTF-16 data-channel cap",
    );
  }
  const byIndex = new Map<number, Uint8Array>();
  for (const frame of chunks) {
    const parsed = parsePhotoChunk(frame);
    byIndex.set(parsed.header.index, parsed.bytes);
  }
  const assembled = assemblePhotoChunks(chunks.length, byIndex);
  assert.deepEqual(Array.from(assembled), Array.from(photoSealed));

  assert.equal(firstGrapheme("❤️👍"), "❤️");
  assert.equal(normalizeReactionEmoji(" 🔥 "), "🔥");
  assert.deepEqual(upsertReaction([], "me", "👍"), [{ from: "me", emoji: "👍" }]);
  assert.deepEqual(upsertReaction([{ from: "me", emoji: "👍" }], "me", "😂"), [
    { from: "me", emoji: "😂" },
  ]);
  assert.deepEqual(upsertReaction([{ from: "me", emoji: "👍" }], "me", ""), []);
  const react = parseControl(
    JSON.stringify({ v: 1, type: "react", id: "m1", emoji: "❤️" }),
  );
  assert.equal(react?.type, "react");
  assert.equal(parseControl(JSON.stringify({ v: 1, type: "future-thing" })), null);

  const scratch = new Uint8Array([9, 8, 7]);
  wipeBytes(scratch);
  assert.deepEqual(Array.from(scratch), [0, 0, 0]);

  const quota = Object.assign(new Error("The quota has been exceeded."), {
    name: "QuotaExceededError",
  });
  assert.equal(isHomeChatQuotaError(quota), true);
  assert.match(describeHomeChatError(quota, "fallback"), /too busy for that photo/);

  assert.equal(maskEndpoint("192.168.1.24"), "192.168.×.×");
  assert.equal(maskEndpoint("2001:db8::1"), "IPv6 on this network");
  assert.equal(pathKindFromCandidates("host", "host"), "direct");
  assert.equal(pathKindFromCandidates("host", "srflx"), "stun");
  assert.equal(pathKindFromCandidates("relay", "host"), "relay");
  assert.equal(pathLabelFor("direct"), "Direct · same Wi-Fi");

  const direct = buildLinkReport({
    stats: [
      {
        id: "T",
        type: "transport",
        selectedCandidatePairId: "P",
        dtlsState: "connected",
        iceState: "connected",
      },
      {
        id: "P",
        type: "candidate-pair",
        localCandidateId: "L",
        remoteCandidateId: "R",
        nominated: true,
        state: "succeeded",
      },
      { id: "L", type: "local-candidate", candidateType: "host", address: "192.168.0.4" },
      { id: "R", type: "remote-candidate", candidateType: "host", address: "192.168.0.8" },
      { id: "C", type: "data-channel", messagesSent: 4, messagesReceived: 3 },
    ],
    channelState: "open",
    dataChannelCount: 1,
    mediaTrackCount: 0,
  });
  assert.equal(direct.pathKind, "direct");
  assert.equal(direct.localAddress, "192.168.×.×");
  assert.equal(direct.warning, null);
  assert.equal(direct.hops.some((hop) => hop.id === "server" && hop.tone === "muted"), true);

  const relayed = buildLinkReport({
    stats: [
      {
        id: "T",
        type: "transport",
        selectedCandidatePairId: "P",
        dtlsState: "connected",
        iceState: "connected",
      },
      {
        id: "P",
        type: "candidate-pair",
        localCandidateId: "L",
        remoteCandidateId: "R",
        nominated: true,
      },
      { id: "L", type: "local-candidate", candidateType: "host", address: "10.0.0.2" },
      { id: "R", type: "remote-candidate", candidateType: "relay", address: "203.0.113.9" },
    ],
    channelState: "open",
    dataChannelCount: 1,
    mediaTrackCount: 0,
  });
  assert.equal(relayed.pathKind, "relay");
  assert.match(relayed.warning ?? "", /relay/);

  const extraChannel = buildLinkReport({
    stats: [],
    channelState: "open",
    dataChannelCount: 2,
    mediaTrackCount: 0,
  });
  assert.match(extraChannel.warning ?? "", /data channel/);

  const media = buildLinkReport({
    stats: [],
    channelState: "open",
    dataChannelCount: 1,
    mediaTrackCount: 1,
  });
  assert.match(media.warning ?? "", /media track/);

  const crowded = buildLinkReport({
    stats: [
      { type: "remote-candidate", address: "192.168.1.2" },
      { type: "remote-candidate", address: "192.168.1.3" },
      { type: "remote-candidate", address: "192.168.1.4" },
    ],
    channelState: "open",
    dataChannelCount: 1,
    mediaTrackCount: 0,
  });
  assert.equal(crowded.extraRemoteAddresses, false);
  assert.equal(crowded.warning, null);

  const front = describeScreenWatch({ visible: true, focused: true });
  assert.equal(front.inFront, true);
  assert.match(front.detail, /cannot tell if someone is watching the glass/);
  const hidden = describeScreenWatch({ visible: false, focused: true });
  assert.equal(hidden.inFront, false);

  console.log("home-chat.test.ts: ok");
}

void main();
