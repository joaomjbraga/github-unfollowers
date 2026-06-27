/**
 * Módulo de tema claro/escuro.
 * Salva a preferência do usuário no storage e aplica ao <html>.
 */

import { getStorage, setStorage } from "./storage.js";

const STORAGE_KEY = "theme_v1";

/** @returns {Promise<"dark"|"light">} */
export async function loadTheme() {
  const saved = await getStorage(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  // Respeita a preferência do sistema como padrão
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** @param {"dark"|"light"} theme */
export async function saveTheme(theme) {
  await setStorage(STORAGE_KEY, theme);
}

/** @param {"dark"|"light"} theme */
export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export async function initTheme() {
  const theme = await loadTheme();
  applyTheme(theme);
  return theme;
}

/** @param {"dark"|"light"} current */
export function toggleTheme(current) {
  return current === "dark" ? "light" : "dark";
}
