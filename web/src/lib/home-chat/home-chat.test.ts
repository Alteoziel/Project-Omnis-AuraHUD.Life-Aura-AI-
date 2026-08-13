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
} from "@/lib/home-chat/crypto";
import { encodeHomeChatInvite, parseHomeChatInvite } from "@/lib/home-chat/invite";
import {
  assemblePhotoChunks,
  parsePhotoChunk,
  splitPhotoChunks,
} from "@/lib/home-chat/protocol";

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
  const byIndex = new Map<number, Uint8Array>();
  for (const frame of chunks) {
    const parsed = parsePhotoChunk(frame);
    byIndex.set(parsed.header.index, parsed.bytes);
  }
  const assembled = assemblePhotoChunks(chunks.length, byIndex);
  assert.deepEqual(Array.from(assembled), Array.from(photoSealed));

  const scratch = new Uint8Array([9, 8, 7]);
  wipeBytes(scratch);
  assert.deepEqual(Array.from(scratch), [0, 0, 0]);

  console.log("home-chat.test.ts: ok");
}

void main();
