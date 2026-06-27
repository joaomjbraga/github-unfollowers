import { state } from "./store.js";
import * as cache from "./cache.js";

const GH = "https://api.github.com";
const FETCH_TIMEOUT = 30000;

const RETRY_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;

const rateLimit = {
  remaining: null,
  reset: null,
  limit: null,
};

let lastScopes = null;

function updateRateLimit(headers) {
  const rem = headers.get("X-RateLimit-Remaining");
  const reset = headers.get("X-RateLimit-Reset");
  const limit = headers.get("X-RateLimit-Limit");
  if (rem !== null) rateLimit.remaining = parseInt(rem, 10);
  if (reset !== null) rateLimit.reset = parseInt(reset, 10);
  if (limit !== null) rateLimit.limit = parseInt(limit, 10);
}

export function getRateLimitDelay() {
  if (rateLimit.remaining === null || rateLimit.reset === null) return 300;
  const now = Math.floor(Date.now() / 1000);
  const secondsUntilReset = Math.max(0, rateLimit.reset - now);
  if (rateLimit.remaining <= 10 && secondsUntilReset > 0) {
    return Math.min(secondsUntilReset * 1000, 60000);
  }
  if (rateLimit.remaining <= 100) {
    return 500;
  }
  return 0;
}

export function getRateLimitInfo() {
  return { ...rateLimit };
}

export function getTokenScopes() {
  return lastScopes;
}

export async function ghFetch(path, method = "GET") {
  let attempt = 0;
  while (true) {
    let res;
    try {
      res = await fetch(`${GH}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${state.token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
    } catch (e) {
      if (e.name === "AbortError") {
        throw new Error("A requisição excedeu o tempo limite. Verifique sua conexão.");
      }
      if (e instanceof TypeError && e.message.includes("fetch")) {
        throw new Error("Sem conexão com a internet. Verifique sua rede.");
      }
      throw e;
    }
    lastScopes = res.headers.get("X-OAuth-Scopes") || null;
    updateRateLimit(res.headers);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 401) {
        await removeStorage("gh_token");
        state.token = null;
        const err = new Error("Sessão expirada. Faça login novamente.");
        err.isAuthError = true;
        throw err;
      }
      const retryable = new Set([429, 500, 502, 503, 504]).has(res.status);
      if (retryable && attempt < MAX_RETRIES) {
        let delay;
        if (res.status === 429) {
          const retryAfter = parseInt(
            res.headers.get("Retry-After") || "1",
            10,
          );
          delay = Math.max(retryAfter * 1000, 1000);
        } else {
          delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        }
        await new Promise((r) => setTimeout(r, delay));
        attempt++;
        continue;
      }
      const err = new Error(errData.message || `HTTP ${res.status}`);
      throw err;
    }
    return method === "DELETE" || res.status === 204 ? null : await res.json();
  }
}

async function fetchPage(path, page) {
  const cached = cache.get(path, page);
  const url = `${GH}${path}?per_page=100&page=${page}`;
  const headers = {
    Authorization: `Bearer ${state.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (cached?.etag) {
    headers["If-None-Match"] = cached.etag;
  }

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT) });

  if (res.status === 304 && cached) {
    return cached.data;
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const err = new Error(errData.message || `HTTP ${res.status}`);
    if (res.status === 401) {
      err.isAuthError = true;
    }
    throw err;
  }

  const data = await res.json();
  const etag = res.headers.get("ETag");
  if (etag) {
    cache.set(path, page, data, etag);
  }
  return data;
}

export async function fetchUser() {
  return ghFetch("/user");
}

export async function fetchFollowing(login) {
  return fetchAllPages(`/users/${login}/following`);
}

export async function fetchFollowers(login) {
  return fetchAllPages(`/users/${login}/followers`);
}

export async function fetchAllPages(path, { onProgress } = {}) {
  const results = [];
  let page = 1;
  while (true) {
    const data = await fetchPage(path, page);
    if (!data || data.length === 0) break;
    results.push(...data);
    onProgress?.(page);
    if (data.length < 100) break;
    page++;
  }
  return results;
}

export async function fetchBoth(login, { onPageFollowing, onPageFollowers } = {}) {
  const path = `/users/${login}`;
  const [followingRes, followersRes] = await Promise.allSettled([
    fetchAllPages(`${path}/following`, { onProgress: onPageFollowing }),
    fetchAllPages(`${path}/followers`, { onProgress: onPageFollowers }),
  ]);

  return {
    following: followingRes.status === "fulfilled" ? followingRes.value : [],
    followers: followersRes.status === "fulfilled" ? followersRes.value : [],
    errors: [followingRes, followersRes]
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason),
  };
}

export function clearCache() {
  cache.clear();
}

export async function initCache() {
  await cache.loadFromStorage();
}

export async function persistCache() {
  await cache.saveToStorage();
}

export function getStorage(key) {
  return new Promise((resolve) =>
    chrome.storage.local.get([key], (res) => resolve(res[key] || null)),
  );
}

export function setStorage(key, val) {
  return new Promise((resolve) =>
    chrome.storage.local.set({ [key]: val }, resolve),
  );
}

export function removeStorage(key) {
  return new Promise((resolve) => chrome.storage.local.remove([key], resolve));
}
