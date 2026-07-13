/**
 * Módulo de whitelist — usuários que o dono quer seguir mesmo sem reciprocidade.
 * Esses usuários são ocultados da aba "Não te seguem de volta".
 */

import { getStorage, setStorage } from "./storage.js";

export const WHITELIST_STORAGE_KEY = "whitelist_v1";
const STORAGE_KEY = WHITELIST_STORAGE_KEY;

/** @returns {Promise<Set<string>>} */
export async function loadWhitelist() {
  const raw = await getStorage(STORAGE_KEY);
  return new Set(Array.isArray(raw) ? raw : []);
}

/** @param {Set<string>} set */
async function saveWhitelist(set) {
  await setStorage(STORAGE_KEY, [...set]);
}

/** @param {string} login */
export async function addToWhitelist(login) {
  const set = await loadWhitelist();
  set.add(login);
  await saveWhitelist(set);
}

/** @param {string} login */
export async function removeFromWhitelist(login) {
  const set = await loadWhitelist();
  set.delete(login);
  await saveWhitelist(set);
}
