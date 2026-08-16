import { state } from "./store.js";
import { removeStorage } from "./storage.js";
import * as cache from "./cache.js";
import { STORAGE_KEYS, GITHUB_API, FETCH_TIMEOUT_MS, MAX_RETRIES, PAGE_SIZE } from "./constants.js";
import { httpFriendlyMessage, sleep } from "./utils.js";
import { mockFetch } from "./dev.js";
import { t } from "./i18n.js";

// Re-exporta helpers de cache
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
 * Constrói um Error com mensagem amigável a partir de uma Response de erro.
 * @param {Response} res
 * @returns {Promise<Error>}
 */
async function buildApiError(res) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    const friendly = httpFriendlyMessage(res.status);
    const err = new Error(friendly.html);
    err.httpStatus = res.status;
    err.isServerError = friendly.isServer;
    return err;
  }
  const friendly = httpFriendlyMessage(res.status);
  const errData = await res.json().catch(() => ({}));
  const err = new Error(friendly.html || errData.message);
  err.httpStatus = res.status;
  err.isServerError = friendly.isServer;
  return err;
}

/**
 * Fetch com retry automático, rate limit e tratamento de erros.
 * Retorna a Response quando ok ou 304; lança erro nos demais casos.
 * @param {string} url
 * @param {{ headers?: Record<string,string> }} [opts]
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, { headers, method = "GET" } = {}) {
  let attempt = 0;
  while (true) {
    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      throw wrapNetworkError(e);
    }

    updateRateLimit(res.headers);

    if (res.ok || res.status === 304) return res;

    if (res.status === 401) {
      const isMock = res.headers.get("X-Mock-Response") === "true";
      if (!isMock) {
        await removeStorage(STORAGE_KEYS.token);
        state.token = null;
      }
      throw authError(t("connectErrorSession"));
    }

    const retryable = [429, 500, 502, 503, 504].includes(res.status);
    if (retryable && attempt < MAX_RETRIES) {
      const delay = res.status === 429
        ? Math.max((parseInt(res.headers.get("Retry-After") || "1", 10) || 1) * 1000, 1000)
        : Math.min(1000 * 2 ** attempt, 10_000);
      await sleep(delay);
      attempt++;
      continue;
    }

    throw await buildApiError(res);
  }
}

/**
 * Faz uma chamada autenticada à API do GitHub com retry automático.
 * @param {string} path  Caminho relativo (ex: "/user/following/octocat")
 * @param {"GET"|"PUT"|"DELETE"} method
 * @returns {Promise<unknown>}
 */
export async function ghFetch(path, method = "GET") {
  const mockRes = await mockFetch(path, method);
  if (mockRes) {
    if (mockRes.status === 401) throw authError(t("connectErrorSession"));
    if (mockRes.status >= 400) throw await buildApiError(mockRes);
    return method === "DELETE" || mockRes.status === 204 ? null : mockRes.json();
  }

  const res = await fetchWithRetry(`${GITHUB_API}${path}`, { headers: buildHeaders(), method });
  return method === "DELETE" || res.status === 204 ? null : res.json();
}

// ---------------------------------------------------------------------------
// Paginação com ETag cache
// ---------------------------------------------------------------------------

/**
 * Busca uma página específica com suporte a ETag (304 Not Modified).
 */
async function fetchPage(path, page) {
  const cached = cache.get(path, page);
  const headers = { ...buildHeaders() };
  if (cached?.etag) headers["If-None-Match"] = cached.etag;

  const mockRes = await mockFetch(path);
  if (mockRes) {
    if (mockRes.status === 304 && cached) return cached.data;
    if (mockRes.status === 401) throw authError(t("connectErrorSession"));
    if (!mockRes.ok) throw await buildApiError(mockRes);
    const data = await mockRes.json();
    const etag = mockRes.headers.get("ETag");
    if (etag) cache.set(path, page, data, etag);
    return data;
  }

  const res = await fetchWithRetry(`${GITHUB_API}${path}?per_page=${PAGE_SIZE}&page=${page}`, { headers });
  if (res.status === 304 && cached) return cached.data;
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
    return new Error(t("apiTimeout"));
  }
  if (e instanceof TypeError) {
    return new Error(t("apiNetworkError"));
  }
  return e;
}
