import { getStorage, setStorage } from "./storage.js";
import { STORAGE_KEYS } from "./constants.js";

const MEMORY_TTL = 5 * 60 * 1000;   // 5 min — validade na memória
const STORAGE_TTL = 60 * 60 * 1000; // 1 h  — validade persistida

/** @type {Map<string, {data: unknown, etag: string|null, ts: number}>} */
const memory = new Map();
let storageLoaded = false;

function cacheKey(path, page) {
  return `${path}?per_page=100&page=${page}`;
}

/** @returns {{data: unknown, etag: string|null} | null} */
export function get(path, page) {
  const entry = memory.get(cacheKey(path, page));
  if (entry && Date.now() - entry.ts < MEMORY_TTL) return entry;
  return null;
}

/** @param {string} etag */
export function set(path, page, data, etag) {
  memory.set(cacheKey(path, page), { data, etag: etag ?? null, ts: Date.now() });
}

export function clear() {
  memory.clear();
}

export async function loadFromStorage() {
  if (storageLoaded) return;
  try {
    const stored = await getStorage(STORAGE_KEYS.pageCache);
    if (stored && typeof stored === "object") {
      const now = Date.now();
      for (const [key, entry] of Object.entries(stored)) {
        if (now - entry.ts < STORAGE_TTL) {
          memory.set(key, entry);
        }
      }
    }
  } catch {
    // storage corrompido ou inacessível — ignora e segue em frente
  }
  storageLoaded = true;
}

export async function saveToStorage() {
  const now = Date.now();
  const obj = {};
  for (const [key, entry] of memory) {
    if (now - entry.ts < STORAGE_TTL) obj[key] = entry;
  }
  if (Object.keys(obj).length === 0) return;
  try {
    await setStorage(STORAGE_KEYS.pageCache, obj);
  } catch {
    // storage cheio — não é crítico, ignora
  }
}
