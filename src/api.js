import { state } from "./store.js";
import { removeStorage } from "./storage.js";
import * as cache from "./cache.js";
import { STORAGE_KEYS, GITHUB_API, FETCH_TIMEOUT_MS, MAX_RETRIES, PAGE_SIZE } from "./constants.js";

// Re-exporta helpers de storage para que app.js não precise importar dois módulos
export { getStorage, setStorage, setStorageMulti, removeStorage } from "./storage.js";
export { loadFromStorage as initCache, saveToStorage as persistCache, clear as clearCache } from "./cache.js";

// ---------------------------------------------------------------------------
// Rate limit tracking
// ---------------------------------------------------------------------------

const rateLimit = {
  remaining: /** @type {number|null} */ (null),
  reset: /** @type {number|null} */ (null),
};

function updateRateLimit(headers) {
  const rem = headers.get("X-RateLimit-Remaining");
  const reset = headers.get("X-RateLimit-Reset");
  if (rem !== null) rateLimit.remaining = parseInt(rem, 10);
  if (reset !== null) rateLimit.reset = parseInt(reset, 10);
}

/**
 * Devolve quantos ms esperar antes da próxima chamada de API.
 * Retorna 0 quando há margem confortável.
 */
export function getRateLimitDelay() {
  if (rateLimit.remaining === null || rateLimit.reset === null) return 300;
  const secondsUntilReset = Math.max(0, rateLimit.reset - Math.floor(Date.now() / 1000));
  if (rateLimit.remaining <= 10 && secondsUntilReset > 0) {
    return Math.min(secondsUntilReset * 1000, 60_000);
  }
  if (rateLimit.remaining <= 100) return 500;
  return 0;
}

// ---------------------------------------------------------------------------
// Core fetch com retry e tratamento de erros
// ---------------------------------------------------------------------------

/**
 * Faz uma chamada autenticada à API do GitHub com retry automático.
 * @param {string} path  Caminho relativo (ex: "/user/following/octocat")
 * @param {"GET"|"PUT"|"DELETE"} method
 * @returns {Promise<unknown>}
 */
export async function ghFetch(path, method = "GET") {
  let attempt = 0;

  while (true) {
    let res;
    try {
      res = await fetch(`${GITHUB_API}${path}`, {
        method,
        headers: buildHeaders(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      throw wrapNetworkError(e);
    }

    updateRateLimit(res.headers);

    if (res.ok || res.status === 204) {
      return method === "DELETE" || res.status === 204 ? null : res.json();
    }

    if (res.status === 401) {
      await removeStorage(STORAGE_KEYS.token);
      state.token = null;
      throw authError("Sessão expirada. Faça login novamente.");
    }

    const retryable = [429, 500, 502, 503, 504].includes(res.status);
    if (retryable && attempt < MAX_RETRIES) {
      const delay = res.status === 429
        ? Math.max(parseInt(res.headers.get("Retry-After") || "1", 10) * 1000, 1000)
        : Math.min(1000 * 2 ** attempt, 10_000);
      await sleep(delay);
      attempt++;
      continue;
    }

    const errData = await res.json().catch(() => ({}));
    const err = new Error(errData.message || `HTTP ${res.status}`);
    err.httpStatus = res.status;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Paginação com ETag cache
// ---------------------------------------------------------------------------

/**
 * Busca uma página específica com suporte a ETag (304 Not Modified).
 */
async function fetchPage(path, page) {
  const cached = cache.get(path, page);
  const url = `${GITHUB_API}${path}?per_page=${PAGE_SIZE}&page=${page}`;
  const headers = buildHeaders();
  if (cached?.etag) headers["If-None-Match"] = cached.etag;

  let res;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (e) {
    throw wrapNetworkError(e);
  }

  updateRateLimit(res.headers);

  if (res.status === 304 && cached) return cached.data;

  if (!res.ok) {
    if (res.status === 401) throw authError("Sessão expirada. Faça login novamente.");
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const etag = res.headers.get("ETag");
  if (etag) cache.set(path, page, data, etag);
  return data;
}

/**
 * Itera todas as páginas de um endpoint paginado do GitHub.
 * @param {string} path
 */
async function fetchAllPages(path) {
  const results = [];
  let page = 1;
  while (true) {
    const data = await fetchPage(path, page);
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Endpoints de domínio
// ---------------------------------------------------------------------------

export function fetchUser() {
  return ghFetch("/user");
}

export function fetchFollowing(login) {
  return fetchAllPages(`/users/${login}/following`);
}

export function fetchFollowers(login) {
  return fetchAllPages(`/users/${login}/followers`);
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function buildHeaders() {
  return {
    Authorization: `Bearer ${state.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function authError(message) {
  const err = new Error(message);
  err.isAuthError = true;
  return err;
}

function wrapNetworkError(e) {
  if (e.name === "AbortError" || e.name === "TimeoutError") {
    return new Error("A requisição excedeu o tempo limite. Verifique sua conexão.");
  }
  if (e instanceof TypeError) {
    return new Error("Sem conexão com a internet. Verifique sua rede.");
  }
  return e;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
