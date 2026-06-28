/**
 * Módulo de histórico de eventos de follow/unfollow.
 * Guarda eventos por 30 dias no chrome.storage.local.
 */

import { getStorage, setStorage } from "./storage.js";

export const HISTORY_STORAGE_KEY = "event_history_v1";
const STORAGE_KEY = HISTORY_STORAGE_KEY;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

/**
 * @typedef {{ type: "followed"|"unfollowed", login: string, avatar_url: string, ts: number }} HistoryEvent
 */

/** @returns {Promise<HistoryEvent[]>} */
export async function loadHistory() {
  const raw = await getStorage(STORAGE_KEY);
  if (!Array.isArray(raw)) return [];
  const cutoff = Date.now() - MAX_AGE_MS;
  return raw.filter((e) => e.ts >= cutoff);
}

/**
 * Adiciona um evento e expurga os antigos.
 * @param {{ type: "followed"|"unfollowed", login: string, avatar_url: string }} event
 */
export async function addEvent(event) {
  const history = await loadHistory();
  // Evita duplicata imediata (mesmo login + tipo nos últimos 60s)
  const recent = history.find(
    (e) => e.login === event.login && e.type === event.type && Date.now() - e.ts < 60_000,
  );
  if (recent) return;
  history.unshift({ ...event, ts: Date.now() });
  await saveHistory(history);
}

/** @param {HistoryEvent[]} history */
async function saveHistory(history) {
  const cutoff = Date.now() - MAX_AGE_MS;
  const trimmed = history.filter((e) => e.ts >= cutoff);
  await setStorage(STORAGE_KEY, trimmed);
}

export async function clearHistory() {
  await setStorage(STORAGE_KEY, []);
}
