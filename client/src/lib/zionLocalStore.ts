/**
 * Zion local-first storage — conversation history and learned memory never
 * leave the user's device. The server processes a chat turn in memory only
 * (to call the LLM) and never writes the message content or extracted facts
 * to its own database; this module is the actual source of truth, living in
 * the browser's IndexedDB, namespaced per account so a shared device never
 * mixes data between users.
 */

export interface LocalZionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  plannerActions?: unknown;
  isVoice?: boolean;
  createdAt: string; // ISO string
}

export interface LocalZionMemory {
  keyName: string;
  category: "preference" | "pattern" | "insight" | "fact";
  value: string;
  confidence: number;
  observedCount: number;
  lastObservedAt: string;
  updatedAt: string;
}

const DB_VERSION = 1;
const MESSAGES_STORE = "messages";
const MEMORY_STORE = "memory";

function dbName(userId: number | string) {
  return `bdb-zion-${userId}`;
}

function openDb(userId: number | string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName(userId), DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const store = db.createObjectStore(MESSAGES_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains(MEMORY_STORE)) {
        db.createObjectStore(MEMORY_STORE, { keyPath: "keyName" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getLocalHistory(userId: number | string, limit = 200): Promise<LocalZionMessage[]> {
  const db = await openDb(userId);
  const tx = db.transaction(MESSAGES_STORE, "readonly");
  const all = await promisifyRequest(tx.objectStore(MESSAGES_STORE).getAll());
  return (all as LocalZionMessage[])
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-limit);
}

export async function addLocalMessage(userId: number | string, msg: LocalZionMessage): Promise<void> {
  const db = await openDb(userId);
  const tx = db.transaction(MESSAGES_STORE, "readwrite");
  tx.objectStore(MESSAGES_STORE).put(msg);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearLocalHistory(userId: number | string): Promise<void> {
  const db = await openDb(userId);
  const tx = db.transaction(MESSAGES_STORE, "readwrite");
  tx.objectStore(MESSAGES_STORE).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalMemories(userId: number | string): Promise<LocalZionMemory[]> {
  const db = await openDb(userId);
  const tx = db.transaction(MEMORY_STORE, "readonly");
  const all = await promisifyRequest(tx.objectStore(MEMORY_STORE).getAll());
  return (all as LocalZionMemory[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Insert a newly-learned fact, or bump an existing one's confidence/observation count */
export async function upsertLocalMemory(
  userId: number | string,
  item: { category: LocalZionMemory["category"]; keyName: string; value: string }
): Promise<void> {
  const db = await openDb(userId);
  const tx = db.transaction(MEMORY_STORE, "readwrite");
  const store = tx.objectStore(MEMORY_STORE);
  const existing = await promisifyRequest(store.get(item.keyName)) as LocalZionMemory | undefined;
  const now = new Date().toISOString();
  store.put({
    keyName: item.keyName,
    category: item.category,
    value: item.value,
    confidence: existing ? Math.min(1, existing.confidence + 0.1) : 1,
    observedCount: existing ? existing.observedCount + 1 : 1,
    lastObservedAt: now,
    updatedAt: now,
  } as LocalZionMemory);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteLocalMemory(userId: number | string, keyName: string): Promise<void> {
  const db = await openDb(userId);
  const tx = db.transaction(MEMORY_STORE, "readwrite");
  tx.objectStore(MEMORY_STORE).delete(keyName);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Formats memory entries into the text block sent to the server for prompt-building only — never stored there */
export function formatMemoryContext(memories: LocalZionMemory[]): string {
  if (!memories.length) return "";
  return memories.map(m => `[${m.category}] ${m.keyName}: ${m.value}`).join("\n");
}

export interface ZionDataBundle {
  messages: LocalZionMessage[];
  memory: LocalZionMemory[];
  exportedAt: string;
}

export async function exportLocalData(userId: number | string): Promise<ZionDataBundle> {
  const [messages, memory] = await Promise.all([
    getLocalHistory(userId, 100000),
    getLocalMemories(userId),
  ]);
  return { messages, memory, exportedAt: new Date().toISOString() };
}

/** Merges an imported bundle into local storage (does not wipe existing data first) */
export async function importLocalData(userId: number | string, bundle: ZionDataBundle): Promise<void> {
  const db = await openDb(userId);
  const tx = db.transaction([MESSAGES_STORE, MEMORY_STORE], "readwrite");
  const msgStore = tx.objectStore(MESSAGES_STORE);
  const memStore = tx.objectStore(MEMORY_STORE);
  for (const m of bundle.messages || []) msgStore.put(m);
  for (const m of bundle.memory || []) memStore.put(m);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
