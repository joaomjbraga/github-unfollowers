import { state } from './store.js';

const GH = 'https://api.github.com';

const RETRY_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;

const rateLimit = {
  remaining: null,
  reset: null,
  limit: null,
};

const cache = new Map();

function updateRateLimit(headers) {
  const rem = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');
  const limit = headers.get('X-RateLimit-Limit');
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

export async function ghFetch(path, method = 'GET') {
  let attempt = 0;
  while (true) {
    const res = await fetch(`${GH}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${state.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    updateRateLimit(res.headers);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 401) {
        await removeStorage('gh_token');
        state.token = null;
        const err = new Error('Sessão expirada. Faça login novamente.');
        err.isAuthError = true;
        throw err;
      }
      const retryable = new Set([429, 500, 502, 503, 504]).has(res.status);
      if (retryable && attempt < MAX_RETRIES) {
        let delay;
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('Retry-After') || '1', 10);
          delay = Math.max(retryAfter * 1000, 1000);
        } else {
          delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        }
        await new Promise(r => setTimeout(r, delay));
        attempt++;
        continue;
      }
      const err = new Error(errData.message || `HTTP ${res.status}`);
      throw err;
    }
    return method === 'DELETE' || res.status === 204 ? null : await res.json();
  }
}

export async function fetchAllPages(path, ttlMs = 300000) {
  const cacheKey = `${state.token || 'no-token'}:${path}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < ttlMs) {
    return cached.data;
  }
  const results = [];
  let page = 1;
  while (true) {
    const data = await ghFetch(`${path}?per_page=100&page=${page}`);
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < 100) break;
    page++;
  }
  cache.set(cacheKey, { data: results, ts: Date.now() });
  return results;
}

export function clearCache() {
  cache.clear();
}

export function getStorage(key) {
  return new Promise(resolve =>
    chrome.storage.local.get([key], res => resolve(res[key] || null))
  );
}

export function setStorage(key, val) {
  return new Promise(resolve => chrome.storage.local.set({ [key]: val }, resolve));
}

export function removeStorage(key) {
  return new Promise(resolve => chrome.storage.local.remove([key], resolve));
}
