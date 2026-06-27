const MEMORY_TTL = 5 * 60 * 1000;
const STORAGE_TTL = 60 * 60 * 1000;
const STORAGE_KEY = "page_cache_v2";

const memory = new Map();
let storageLoaded = false;

export function get(path, page) {
  const key = `${path}?per_page=100&page=${page}`;
  const entry = memory.get(key);
  if (entry && Date.now() - entry.ts < MEMORY_TTL) {
    return entry;
  }
  return null;
}

export function set(path, page, data, etag) {
  const key = `${path}?per_page=100&page=${page}`;
  memory.set(key, { data, etag: etag || null, ts: Date.now() });
}

export function invalidate(path) {
  for (const key of memory.keys()) {
    if (key.startsWith(path)) {
      memory.delete(key);
    }
  }
}

export function clear() {
  memory.clear();
}

export function getSize() {
  return memory.size;
}

export async function loadFromStorage() {
  if (storageLoaded) return;
  try {
    const raw = await chrome.storage.local.get([STORAGE_KEY]);
    const stored = raw[STORAGE_KEY];
    if (stored && typeof stored === "object") {
      const now = Date.now();
      for (const [key, entry] of Object.entries(stored)) {
        if (now - entry.ts < STORAGE_TTL) {
          memory.set(key, entry);
        }
      }
    }
  } catch {
    // storage corrompido ou inacessível — ignora
  }
  storageLoaded = true;
}

export async function saveToStorage() {
  const now = Date.now();
  const obj = {};
  for (const [key, entry] of memory) {
    if (now - entry.ts < STORAGE_TTL) {
      obj[key] = entry;
    }
  }
  if (Object.keys(obj).length === 0) return;
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: obj });
  } catch {
    // storage cheio ou inacessível — limpa e continua
  }
}
