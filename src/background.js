/**
 * Service Worker da extensão.
 *
 * Responsabilidade única: detectar mudanças nas listas de following/followers
 * enquanto o popup está fechado e gravar os "novos" em PENDING_KEYS para que
 * o popup os exiba com o badge "Novo" na próxima abertura.
 *
 * Não duplica lógica de api.js (que depende do popup). Aqui usamos fetch
 * diretamente porque o service worker não tem acesso ao `state` do popup.
 */

import { STORAGE_KEYS, GITHUB_API, BG_ALARM_INTERVAL_MINUTES, PAGE_SIZE } from "./constants.js";
import { getStorage, setStorageMulti } from "./storage.js";
import { computeRelationshipLists } from "./utils.js";
import { mockFetch } from "./dev.js";

const { snapshots: SNAP, pending: PEND, cachedLists, token: TOKEN_KEY } = STORAGE_KEYS;

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(setupAlarm);
chrome.runtime.onStartup.addListener(setupAlarm);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "bg_check") checkForChanges().catch(console.error);
});

function setupAlarm() {
  chrome.alarms.create("bg_check", { periodInMinutes: BG_ALARM_INTERVAL_MINUTES });
  checkForChanges().catch(console.error);
}

// ---------------------------------------------------------------------------
// Lógica principal
// ---------------------------------------------------------------------------

async function checkForChanges() {
  const token = await getStorage(TOKEN_KEY);
  if (!token) return;

  let user;
  try {
    user = await bgFetch("/user", token);
  } catch {
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#ff9500" });
    return;
  }
  if (!user) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }

  chrome.action.setBadgeText({ text: "" });

  let following, followers;
  try {
    [following, followers] = await Promise.all([
      fetchAllPages(`/users/${user.login}/following`, token),
      fetchAllPages(`/users/${user.login}/followers`, token),
    ]);
  } catch {
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#ff9500" });
    return;
  }
  if (!following || !followers) return;

  const { unfollowers, notFollowingBack, mutuals } = computeRelationshipLists({ followers, following });
  const initialized = await getStorage(SNAP.initialized);

  const cacheUpdate = {
    [cachedLists]: { following, followers, unfollowers, notFollowingBack, mutuals, ts: Date.now() },
    [SNAP.unfollowers]: unfollowers.map((u) => u.login),
    [SNAP.notFollowingBack]: notFollowingBack.map((u) => u.login),
    [SNAP.mutuals]: mutuals.map((u) => u.login),
    [SNAP.initialized]: true,
  };

  if (!initialized) {
    await setStorageMulti(cacheUpdate);
    return;
  }

  // Calcula novidades em relação ao último snapshot
  const [prevU, prevN, prevM] = await Promise.all([
    getStorage(SNAP.unfollowers).then((v) => v || []),
    getStorage(SNAP.notFollowingBack).then((v) => v || []),
    getStorage(SNAP.mutuals).then((v) => v || []),
  ]);

  const prevUSet = new Set(prevU);
  const prevNSet = new Set(prevN);
  const prevMSet = new Set(prevM);

  const newU = unfollowers.filter((u) => !prevUSet.has(u.login));
  const newN = notFollowingBack.filter((u) => !prevNSet.has(u.login));
  const newM = mutuals.filter((u) => !prevMSet.has(u.login));

  // Sempre atualiza o cache visual
  const writes = { ...cacheUpdate };

  // Só acumula nos PENDING se houver novidades
  if (newU.length > 0 || newN.length > 0 || newM.length > 0) {
    const [pendU, pendN, pendM] = await Promise.all([
      getStorage(PEND.unfollowers).then((v) => new Set(v || [])),
      getStorage(PEND.notFollowingBack).then((v) => new Set(v || [])),
      getStorage(PEND.mutuals).then((v) => new Set(v || [])),
    ]);
    newU.forEach((u) => pendU.add(u.login));
    newN.forEach((u) => pendN.add(u.login));
    newM.forEach((u) => pendM.add(u.login));

    writes[PEND.unfollowers] = [...pendU];
    writes[PEND.notFollowingBack] = [...pendN];
    writes[PEND.mutuals] = [...pendM];
  }

  await setStorageMulti(writes);

  // Atualiza badge do ícone com total de novidades
  const totalNew = newU.length + newN.length + newM.length;
  if (totalNew > 0) {
    chrome.action.setBadgeText({ text: String(totalNew) });
    chrome.action.setBadgeBackgroundColor({ color: "#e34c26" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers locais (sem acesso ao state do popup)
// ---------------------------------------------------------------------------

/**
 * Fetch simples com timeout e verificação de 401.
 * @returns {Promise<unknown|null>} null em caso de 401
 */
async function bgFetch(path, token) {
  let res;
  try {
    const mockRes = await mockFetch(path);
    res = mockRes || await fetch(`${GITHUB_API}${path}`, {
      headers: buildHeaders(token),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    const err = new Error(e.message || "Falha de rede");
    err.isServerError = false;
    throw err;
  }
  if (res.status === 401) return null;
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.httpStatus = res.status;
    err.isServerError = res.status >= 500;
    throw err;
  }
  return res.json();
}

const MAX_BG_RETRIES = 3;

/** Busca todas as páginas de um endpoint paginado. */
async function fetchAllPages(path, token) {
  const results = [];
  let page = 1;
  let retries = 0;
  while (true) {
    let res;
    try {
      const mockRes = await mockFetch(path);
      res = mockRes || await fetch(`${GITHUB_API}${path}?per_page=${PAGE_SIZE}&page=${page}`, {
        headers: buildHeaders(token),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      const err = new Error(e.message || "Falha de rede");
      err.isServerError = false;
      throw err;
    }

    if (res.status === 401) return null;
    if (res.status === 429) {
      if (retries++ >= MAX_BG_RETRIES) return null;
      const retryAfter = parseInt(res.headers.get("Retry-After") || "60", 10);
      const waitMs = (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60) * 1000;
      const cappedMs = Math.min(waitMs, 300_000);
      await new Promise((r) => setTimeout(r, cappedMs));
      continue;
    }
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.httpStatus = res.status;
      err.isServerError = res.status >= 500;
      throw err;
    }

    retries = 0;
    const data = await res.json();
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return results;
}

function buildHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
