import {
  emptyState,
  hydrateState,
  type AuraState,
  type MetricRecord,
  type DemoId,
} from "./schema";

const DB_NAME = "aurahud";
const STORE_NAME = "kv";
const STATE_KEY = "state";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadState(nowMs: number): Promise<AuraState> {
  try {
    const db = await openDb();
    const state = await new Promise<AuraState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(STATE_KEY);
      req.onsuccess = () => resolve(req.result as AuraState | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (state && state.version === 1) return hydrateState(state);
  } catch {
    // First visit or private-mode IDB denial — stay in memory.
  }
  return emptyState(nowMs);
}

export async function saveState(state: AuraState): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_NAME).put(state, STATE_KEY);
  });
  db.close();
}

export async function deleteDatabase(): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

export function newId(): string {
  return crypto.randomUUID();
}

export function recordMetric(
  state: AuraState,
  demoId: DemoId,
  name: string,
  at: number,
): AuraState {
  const metric: MetricRecord = { id: newId(), demoId, name, at };
  return { ...state, metrics: [...state.metrics, metric] };
}
