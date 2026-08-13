import {
  bytesToArrayBuffer,
  decryptBytes,
  encryptBytes,
  importPhotoKey,
  wipeBytes,
} from "@/lib/home-chat/crypto";
import { isHomeChatQuotaError } from "@/lib/home-chat/protocol";

const DB_NAME = "alte-home-chat";
const DB_VERSION = 2;
const PHOTO_STORE = "one-time-photos";

export type StoredOneTimePhoto = {
  id: string;
  roomId: string;
  createdAt: string;
  mime: "image/jpeg";
  sealed: Uint8Array;
  wrap: Uint8Array;
};

type StoredPhotoRow = Omit<StoredOneTimePhoto, "sealed" | "wrap"> & {
  sealed: ArrayBuffer | Uint8Array;
  wrap: ArrayBuffer | Uint8Array;
};

const memoryPhotos = new Map<string, StoredOneTimePhoto>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(PHOTO_STORE)) {
        db.deleteObjectStore(PHOTO_STORE);
      }
      db.createObjectStore(PHOTO_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Home Chat storage failed to open."));
  });
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Home Chat storage request failed."));
  });
}

function coerceBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    const view = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const copy = new Uint8Array(view.byteLength);
    copy.set(view);
    return copy;
  }
  return null;
}

function fromRow(row: StoredPhotoRow | undefined | null): StoredOneTimePhoto | null {
  if (!row) return null;
  const sealed = coerceBytes(row.sealed);
  const wrap = coerceBytes(row.wrap);
  if (!sealed || !wrap) return null;
  return {
    id: row.id,
    roomId: row.roomId,
    createdAt: row.createdAt,
    mime: row.mime,
    sealed,
    wrap,
  };
}

/**
 * Close an open one-time photo when the app actually leaves the foreground
 * (app switcher, another app, lock). Do not use window blur — Control Center
 * and the notification shade fire that on iPhone.
 */
export function shouldCloseOpenPhotoOnLeave(
  eventType: string,
  visibilityState: string,
): boolean {
  if (eventType === "pagehide") return true;
  return eventType === "visibilitychange" && visibilityState === "hidden";
}

export async function saveSealedPhoto(input: {
  id: string;
  roomId: string;
  sealed: Uint8Array;
  keyRaw: Uint8Array;
  wrapKey: CryptoKey;
}): Promise<void> {
  const wrap = await encryptBytes(input.wrapKey, input.keyRaw);
  const photo: StoredOneTimePhoto = {
    id: input.id,
    roomId: input.roomId,
    createdAt: new Date().toISOString(),
    mime: "image/jpeg",
    sealed: input.sealed.slice(),
    wrap,
  };
  memoryPhotos.set(photo.id, photo);
  try {
    const db = await openDb();
    try {
      await reqToPromise(
        db.transaction(PHOTO_STORE, "readwrite").objectStore(PHOTO_STORE).put({
          id: photo.id,
          roomId: photo.roomId,
          createdAt: photo.createdAt,
          mime: photo.mime,
          sealed: bytesToArrayBuffer(photo.sealed),
          wrap: bytesToArrayBuffer(photo.wrap),
        } satisfies StoredPhotoRow),
      );
    } catch (err) {
      if (isHomeChatQuotaError(err)) return;
      throw err;
    } finally {
      db.close();
    }
  } catch (err) {
    if (isHomeChatQuotaError(err)) return;
    // Private mode / IndexedDB missing: keep the sealed copy in RAM for this chat.
  }
}

async function readSealedPhoto(id: string): Promise<StoredOneTimePhoto | null> {
  const cached = memoryPhotos.get(id);
  if (cached) return cached;
  try {
    const db = await openDb();
    try {
      const value = await reqToPromise(
        db.transaction(PHOTO_STORE, "readonly").objectStore(PHOTO_STORE).get(id),
      );
      return fromRow(value as StoredPhotoRow | undefined);
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Decrypt only when the user opens the photo, then overwrite and delete. */
export async function consumeOneTimePhoto(
  id: string,
  wrapKey: CryptoKey,
): Promise<Uint8Array | null> {
  const stored = await readSealedPhoto(id);
  if (!stored) return null;
  let keyRaw: Uint8Array | null = null;
  try {
    keyRaw = await decryptBytes(wrapKey, stored.wrap);
    const photoKey = await importPhotoKey(keyRaw);
    const plain = await decryptBytes(photoKey, stored.sealed);
    wipeBytes(stored.sealed);
    wipeBytes(stored.wrap);
    memoryPhotos.delete(id);
    try {
      const db = await openDb();
      try {
        await reqToPromise(
          db.transaction(PHOTO_STORE, "readwrite").objectStore(PHOTO_STORE).delete(id),
        );
      } catch {
        // Memory copy is already wiped; ignore storage failures on consume.
      } finally {
        db.close();
      }
    } catch {
      // IndexedDB unavailable; RAM copy is already gone.
    }
    return plain;
  } finally {
    if (keyRaw) wipeBytes(keyRaw);
  }
}

export async function deleteOneTimePhoto(id: string): Promise<void> {
  const stored = await readSealedPhoto(id);
  if (stored) {
    wipeBytes(stored.sealed);
    wipeBytes(stored.wrap);
  }
  memoryPhotos.delete(id);
  try {
    const db = await openDb();
    try {
      await reqToPromise(
        db.transaction(PHOTO_STORE, "readwrite").objectStore(PHOTO_STORE).delete(id),
      );
    } finally {
      db.close();
    }
  } catch {
    // IndexedDB unavailable; RAM copy is already gone.
  }
}

export async function purgeHomeChatPhotos(roomId?: string): Promise<void> {
  for (const [id, photo] of memoryPhotos) {
    if (roomId && photo.roomId !== roomId) continue;
    wipeBytes(photo.sealed);
    wipeBytes(photo.wrap);
    memoryPhotos.delete(id);
  }
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(PHOTO_STORE, "readwrite");
      const store = tx.objectStore(PHOTO_STORE);
      const all = await reqToPromise(store.getAll());
      for (const row of all as StoredPhotoRow[]) {
        if (roomId && row.roomId !== roomId) continue;
        const sealed = coerceBytes(row.sealed);
        const wrap = coerceBytes(row.wrap);
        if (sealed) wipeBytes(sealed);
        if (wrap) wipeBytes(wrap);
        store.delete(row.id);
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("Purge failed."));
      });
    } finally {
      db.close();
    }
  } catch {
    // IndexedDB unavailable; RAM copies are already wiped.
  }
}
