import { bytesToArrayBuffer, wipeBytes } from "@/lib/home-chat/crypto";
import { isHomeChatQuotaError } from "@/lib/home-chat/protocol";

const DB_NAME = "alte-home-chat";
const DB_VERSION = 1;
const PHOTO_STORE = "one-time-photos";

export type StoredOneTimePhoto = {
  id: string;
  roomId: string;
  createdAt: string;
  mime: "image/jpeg";
  bytes: Uint8Array;
};

type StoredPhotoRow = Omit<StoredOneTimePhoto, "bytes"> & {
  bytes: ArrayBuffer | Uint8Array;
};

const memoryPhotos = new Map<string, StoredOneTimePhoto>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: "id" });
      }
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
  const bytes = coerceBytes(row.bytes);
  if (!bytes) return null;
  return { id: row.id, roomId: row.roomId, createdAt: row.createdAt, mime: row.mime, bytes };
}

export async function saveOneTimePhoto(
  photo: StoredOneTimePhoto,
): Promise<void> {
  memoryPhotos.set(photo.id, {
    ...photo,
    bytes: photo.bytes.slice(),
  });
  const db = await openDb();
  try {
    await reqToPromise(
      db.transaction(PHOTO_STORE, "readwrite").objectStore(PHOTO_STORE).put({
        id: photo.id,
        roomId: photo.roomId,
        createdAt: photo.createdAt,
        mime: photo.mime,
        bytes: bytesToArrayBuffer(photo.bytes),
      } satisfies StoredPhotoRow),
    );
  } catch (err) {
    if (isHomeChatQuotaError(err)) {
      // Keep the photo in memory for this session if IndexedDB is full.
      return;
    }
    throw err;
  } finally {
    db.close();
  }
}

export async function readOneTimePhoto(
  id: string,
): Promise<StoredOneTimePhoto | null> {
  const cached = memoryPhotos.get(id);
  if (cached) return cached;
  const db = await openDb();
  try {
    const value = await reqToPromise(
      db.transaction(PHOTO_STORE, "readonly").objectStore(PHOTO_STORE).get(id),
    );
    return fromRow(value as StoredPhotoRow | undefined);
  } finally {
    db.close();
  }
}

/** Overwrite bytes, then delete the record so a viewed photo cannot be reopened. */
export async function consumeOneTimePhoto(id: string): Promise<Uint8Array | null> {
  const stored = await readOneTimePhoto(id);
  if (!stored) return null;
  const copy = stored.bytes.slice();
  wipeBytes(stored.bytes);
  memoryPhotos.delete(id);
  const db = await openDb();
  try {
    const tx = db.transaction(PHOTO_STORE, "readwrite");
    tx.objectStore(PHOTO_STORE).put({
      ...stored,
      bytes: bytesToArrayBuffer(stored.bytes),
    } satisfies StoredPhotoRow);
    await reqToPromise(tx.objectStore(PHOTO_STORE).delete(id));
  } catch {
    // Memory copy is already wiped; ignore storage failures on consume.
  } finally {
    db.close();
  }
  return copy;
}

export async function deleteOneTimePhoto(id: string): Promise<void> {
  const stored = await readOneTimePhoto(id);
  if (stored) wipeBytes(stored.bytes);
  memoryPhotos.delete(id);
  const db = await openDb();
  try {
    await reqToPromise(
      db.transaction(PHOTO_STORE, "readwrite").objectStore(PHOTO_STORE).delete(id),
    );
  } finally {
    db.close();
  }
}

export async function purgeHomeChatPhotos(roomId?: string): Promise<void> {
  for (const [id, photo] of memoryPhotos) {
    if (roomId && photo.roomId !== roomId) continue;
    wipeBytes(photo.bytes);
    memoryPhotos.delete(id);
  }
  const db = await openDb();
  try {
    const tx = db.transaction(PHOTO_STORE, "readwrite");
    const store = tx.objectStore(PHOTO_STORE);
    const all = await reqToPromise(store.getAll());
    for (const row of all as StoredPhotoRow[]) {
      if (roomId && row.roomId !== roomId) continue;
      const bytes = coerceBytes(row.bytes);
      if (bytes) wipeBytes(bytes);
      store.delete(row.id);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Purge failed."));
    });
  } finally {
    db.close();
  }
}
