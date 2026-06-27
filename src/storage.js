/**
 * Wrapper tipado sobre chrome.storage.local.
 *
 * Centraliza todas as operações de storage em um único módulo,
 * eliminando os helpers duplicados que existiam em api.js e background.js.
 */

/**
 * @template T
 * @param {string} key
 * @returns {Promise<T | null>}
 */
export function getStorage(key) {
  return new Promise((resolve) =>
    chrome.storage.local.get([key], (res) => {
      const val = res[key];
      resolve(val !== undefined ? val : null);
    }),
  );
}

/**
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<void>}
 */
export function setStorage(key, value) {
  return new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve));
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {Promise<void>}
 */
export function setStorageMulti(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

/**
 * @param {string | string[]} keys
 * @returns {Promise<void>}
 */
export function removeStorage(keys) {
  const arr = Array.isArray(keys) ? keys : [keys];
  return new Promise((resolve) => chrome.storage.local.remove(arr, resolve));
}
