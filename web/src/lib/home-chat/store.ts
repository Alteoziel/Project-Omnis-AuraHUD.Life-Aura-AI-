import { wipeBytes } from "@/lib/home-chat/crypto";

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

export async function saveOneTimePhoto(
  photo: StoredOneTimePhoto,
): Promise<void> {
  const db = await openDb();
  try {
    await reqToPromise(
      db.transaction(PHOTO_STORE, "readwrite").objectStore(PHOTO_STORE).put(photo),
    );
  } finally {
    db.close();
  }
}

export async function readOneTimePhoto(
  id: string,
): Promise<StoredOneTimePhoto | null> {
  const db = await openDb();
  try {
    const value = await reqToPromise(
      db.transaction(PHOTO_STORE, "readonly").objectStore(PHOTO_STORE).get(id),
    );
    return (value as StoredOneTimePhoto | undefined) ?? null;
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
  const db = await openDb();
  try {
    const tx = db.transaction(PHOTO_STORE, "readwrite");
    tx.objectStore(PHOTO_STORE).put({ ...stored, bytes: stored.bytes });
    await reqToPromise(tx.objectStore(PHOTO_STORE).delete(id));
  } finally {
    db.close();
  }
  return copy;
}

export async function deleteOneTimePhoto(id: string): Promise<void> {
  const stored = await readOneTimePhoto(id);
  if (stored) wipeBytes(stored.bytes);
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
  const db = await openDb();
  try {
    const tx = db.transaction(PHOTO_STORE, "readwrite");
    const store = tx.objectStore(PHOTO_STORE);
    const all = await reqToPromise(store.getAll());
    for (const row of all as StoredOneTimePhoto[]) {
      if (roomId && row.roomId !== roomId) continue;
      wipeBytes(row.bytes);
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
