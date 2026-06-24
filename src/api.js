import { state } from './store.js';

const GH = 'https://api.github.com';

export async function ghFetch(path, method = 'GET') {
  const res = await fetch(`${GH}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${state.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return method === 'DELETE' || res.status === 204 ? null : res.json();
}

export async function fetchAllPages(path) {
  const results = [];
  let page = 1;
  while (true) {
    const data = await ghFetch(`${path}?per_page=100&page=${page}`);
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return results;
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
