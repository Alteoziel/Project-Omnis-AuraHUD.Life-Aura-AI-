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
  generatePhotoKey,
  importPhotoKey,
  importPublicKeyB64,
  pairingFingerprint,
  wipeBytes,
  bytesToB64Url,
  b64UrlToBytes,
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
import { deriveHomeChatRatchet } from "@/lib/home-chat/ratchet";
import { shouldCloseOpenPhotoOnLeave } from "@/lib/home-chat/store";

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
  const hostRatchet = await deriveHomeChatRatchet({
    privateKey: alice.privateKey,
    peerPublicKey: await importPublicKeyB64(bobPub),
    role: "host",
  });
  const guestRatchet = await deriveHomeChatRatchet({
    privateKey: bob.privateKey,
    peerPublicKey: await importPublicKeyB64(alicePub),
    role: "guest",
  });
  for (const frame of chunks) {
    const wire = bytesToB64Url(await hostRatchet.sealText(frame));
    assert.ok(
      wire.length * 2 < 12_000,
      "base64 photo frame must fit Safari's UTF-16 data-channel cap",
    );
    const opened = await guestRatchet.openText(b64UrlToBytes(wire));
    assert.equal(opened, frame);
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
  assert.equal(
    isHomeChatQuotaError(new Error("Nearby link is busy. Try the photo again.")),
    true,
  );

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

  assert.equal(shouldCloseOpenPhotoOnLeave("visibilitychange", "hidden"), true);
  assert.equal(shouldCloseOpenPhotoOnLeave("visibilitychange", "visible"), false);
  assert.equal(shouldCloseOpenPhotoOnLeave("pagehide", "visible"), true);
  assert.equal(shouldCloseOpenPhotoOnLeave("blur", "visible"), false);

  const host = await deriveHomeChatRatchet({
    privateKey: alice.privateKey,
    peerPublicKey: await importPublicKeyB64(bobPub),
    role: "host",
  });
  const guest = await deriveHomeChatRatchet({
    privateKey: bob.privateKey,
    peerPublicKey: await importPublicKeyB64(alicePub),
    role: "guest",
  });
  const hello = await host.sealText("hello-1");
  const reply = await guest.sealText("hello-2");
  assert.equal(await guest.openText(hello), "hello-1");
  assert.equal(await host.openText(reply), "hello-2");
  const third = await host.sealText("hello-3");
  assert.equal(await guest.openText(third), "hello-3");
  const firstKey = hello.slice();
  await assert.rejects(() => guest.open(firstKey));

  const skipHost = await deriveHomeChatRatchet({
    privateKey: alice.privateKey,
    peerPublicKey: await importPublicKeyB64(bobPub),
    role: "host",
  });
  const skipGuest = await deriveHomeChatRatchet({
    privateKey: bob.privateKey,
    peerPublicKey: await importPublicKeyB64(alicePub),
    role: "guest",
  });
  const skip0 = await skipHost.sealText("a");
  assert.equal(await skipGuest.openText(skip0), "a");
  await skipHost.sealText("b");
  const skip2 = await skipHost.sealText("c");
  assert.equal(await skipGuest.openText(skip2), "c");

  const { key: photoKey, raw: photoRaw } = await generatePhotoKey();
  const photoInner = await encryptBytes(photoKey, photo);
  const imported = await importPhotoKey(photoRaw);
  wipeBytes(photoRaw);
  const photoPlain = await decryptBytes(imported, photoInner);
  assert.deepEqual(Array.from(photoPlain.slice(0, 16)), Array.from(photo.slice(0, 16)));
  const meta = parseControl(
    JSON.stringify({
      v: 1,
      type: "photo-meta",
      id: "p1",
      mime: "image/jpeg",
      byteLength: 8,
      oneTime: true,
      key: "abc",
    }),
  );
  assert.equal(meta?.type, "photo-meta");
  if (meta?.type === "photo-meta") assert.equal(meta.key, "abc");
  assert.throws(() =>
    parseControl(
      JSON.stringify({
        v: 1,
        type: "photo-meta",
        id: "p1",
        mime: "image/jpeg",
        byteLength: 8,
        oneTime: true,
      }),
    ),
  );

  host.wipe();
  guest.wipe();
  skipHost.wipe();
  skipGuest.wipe();
  hostRatchet.wipe();
  guestRatchet.wipe();

  console.log("home-chat.test.ts: ok");
}

void main();
