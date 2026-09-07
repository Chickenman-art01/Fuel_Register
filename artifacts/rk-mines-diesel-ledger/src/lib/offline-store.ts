export type OfflineQueueItem = {
  id?: number;
  kind: string;
  payload: unknown;
  createdAt: string;
};

type CachedValue = {
  key: string;
  value: unknown;
  updatedAt: string;
};

const databaseName = 'rk-mines-ledger';
const databaseVersion = 1;
let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('cache')) database.createObjectStore('cache', { keyPath: 'key' });
      if (!database.objectStoreNames.contains('queue')) database.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open offline storage.'));
  });
  return databasePromise;
}

async function runTransaction<T>(storeName: 'cache' | 'queue', mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error('Offline storage request failed.'));
  });
}

export async function readCache<T>(key: string): Promise<T | undefined> {
  const result = await runTransaction<CachedValue | undefined>('cache', 'readonly', (store) => store.get(key));
  return result?.value as T | undefined;
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  await runTransaction('cache', 'readwrite', (store) => store.put({ key, value, updatedAt: new Date().toISOString() }));
}

export async function addOfflineQueue(kind: string, payload: unknown): Promise<void> {
  await runTransaction('queue', 'readwrite', (store) => store.add({ kind, payload, createdAt: new Date().toISOString() }));
  window.dispatchEvent(new Event('offline-queue-changed'));
}

export async function listOfflineQueue(): Promise<OfflineQueueItem[]> {
  const result = await runTransaction<OfflineQueueItem[]>('queue', 'readonly', (store) => store.getAll());
  return result ?? [];
}

export async function removeOfflineQueueItem(id: number): Promise<void> {
  await runTransaction('queue', 'readwrite', (store) => store.delete(id));
  window.dispatchEvent(new Event('offline-queue-changed'));
}

export async function updateQueuedCreate(kind: string, temporaryId: number, payload: unknown): Promise<boolean> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('queue', 'readwrite');
    const store = transaction.objectStore('queue');
    const request = store.getAll();
    let updated = false;
    request.onsuccess = () => {
      const item = (request.result as OfflineQueueItem[]).find((candidate) => {
        if (candidate.kind !== kind || !candidate.id) return false;
        const queuedPayload = candidate.payload as { temporaryId?: number };
        return queuedPayload.temporaryId === temporaryId;
      });
      if (item?.id !== undefined) {
        store.put({ ...item, payload: { temporaryId, data: payload } });
        updated = true;
      }
    };
    transaction.oncomplete = () => resolve(updated);
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not update offline queue.'));
  });
}

export async function removeQueuedCreate(kind: string, temporaryId: number): Promise<boolean> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('queue', 'readwrite');
    const store = transaction.objectStore('queue');
    const request = store.getAll();
    let removed = false;
    request.onsuccess = () => {
      const item = (request.result as OfflineQueueItem[]).find((candidate) => {
        if (candidate.kind !== kind || !candidate.id) return false;
        const queuedPayload = candidate.payload as { temporaryId?: number };
        return queuedPayload.temporaryId === temporaryId;
      });
      if (item?.id !== undefined) {
        store.delete(item.id);
        removed = true;
      }
    };
    transaction.oncomplete = () => resolve(removed);
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove offline queue item.'));
  });
}

export async function getOfflineQueueCount(): Promise<number> {
  return runTransaction<number>('queue', 'readonly', (store) => store.count());
}
