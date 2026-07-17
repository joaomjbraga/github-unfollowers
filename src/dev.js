/**
 * Dev Mock — Simulação de respostas da API do GitHub.
 *
 * Intercepta chamadas à API quando o modo dev está ativo,
 * permitindo testar cenários de erro sem depender de falhas reais.
 * Não afeta produção — só atua quando IS_DEV_MODE = true e
 * há um cenário configurado no chrome.storage.local.
 */

import { IS_DEV_MODE, DEV_STORAGE_KEY } from "./constants.js";
import { getStorage, setStorage } from "./storage.js";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_USER = {
  login: "dev-user",
  name: "Dev User",
  avatar_url: "https://avatars.githubusercontent.com/u/0",
  followers: 42,
  following: 10,
  bio: "Usuário de desenvolvimento para testes.",
  location: "Internet",
  company: "Dev Corp",
  public_repos: 5,
};

function mockList(prefix, count) {
  return Array.from({ length: count }, (_, i) => ({
    login: `${prefix}-${i + 1}`,
    name: `User ${i + 1}`,
    avatar_url: `https://avatars.githubusercontent.com/u/${i + 1}`,
    followers: Math.floor(Math.random() * 100),
  }));
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const SCENARIOS = {
  success: {
    name: "Sucesso (200)",
    description: "Resposta OK da API",
    status: 200,
    getResponse(path) {
      if (path === "/user") return { data: MOCK_USER, ok: true };
      if (path.includes("/followers")) return { data: mockList("follower", 3), ok: true };
      if (path.includes("/following")) return { data: mockList("following", 5), ok: true };
      if (path.includes("/repos")) return { data: [], ok: true };
      return { data: MOCK_USER, ok: true };
    },
  },
  "401": {
    name: "401 — Unauthorized",
    description: "Credenciais inválidas",
    status: 401,
    getResponse: () => ({ data: { message: "Bad credentials" }, ok: false }),
  },
  "403": {
    name: "403 — Forbidden",
    description: "Acesso proibido / rate limit",
    status: 403,
    getResponse: () => ({ data: { message: "API rate limit exceeded" }, ok: false }),
  },
  "404": {
    name: "404 — Not Found",
    description: "Recurso não encontrado",
    status: 404,
    getResponse: () => ({ data: { message: "Not Found" }, ok: false }),
  },
  "429": {
    name: "429 — Too Many Requests",
    description: "Limite de requisições excedido",
    status: 429,
    getResponse: () => ({ data: { message: "Rate limit exceeded" }, ok: false }),
  },
  "500": {
    name: "500 — Internal Server Error",
    description: "Erro interno do servidor",
    status: 500,
    getResponse: () => ({ data: { message: "Internal Server Error" }, ok: false }),
  },
  "503": {
    name: "503 — Service Unavailable",
    description: "Serviço indisponível",
    status: 503,
    getResponse: () => ({ data: { message: "Service Unavailable" }, ok: false }),
  },
  "html-response": {
    name: "Resposta HTML",
    description: "GitHub retornou HTML no lugar de JSON",
    status: 503,
    getResponse: () => ({
      data: "<!DOCTYPE html><html><head><title>503 Service Unavailable</title></head><body><h1>Service Unavailable</h1></body></html>",
      ok: false,
      isHtml: true,
    }),
  },
  timeout: {
    name: "Timeout",
    description: "Requisição excedeu o tempo limite",
    status: 0,
    getResponse: () => ({ data: null, ok: false, isTimeout: true }),
  },
  "network-error": {
    name: "Falha de rede",
    description: "Sem conexão com a internet",
    status: 0,
    getResponse: () => ({ data: null, ok: false, isNetwork: true }),
  },
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** @type {{ enabled: boolean, scenario: string, latency: number } | null} */
let config = null;
let loaded = false;

async function ensureLoaded() {
  if (loaded) return;
  config = await getStorage(DEV_STORAGE_KEY);
  loaded = true;
}

export async function getConfig() {
  await ensureLoaded();
  return config || { enabled: false, scenario: null, latency: 0 };
}

export async function setConfig(next) {
  config = next;
  loaded = true;
  await setStorage(DEV_STORAGE_KEY, next);
}

export function getScenarios() {
  return Object.entries(SCENARIOS).map(([key, s]) => ({
    id: key,
    name: s.name,
    description: s.description,
    status: s.status,
  }));
}

// ---------------------------------------------------------------------------
// Mock response builder
// ---------------------------------------------------------------------------

function buildResponse(scenario, path) {
  const s = SCENARIOS[scenario];
  if (!s) return null;
  const result = s.getResponse(path);
  result.status = s.status;
  return result;
}

function fakeHeaders(extra = {}) {
  return new Headers({
    "X-RateLimit-Remaining": "5000",
    "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 3600),
    "X-Mock-Response": "true",
    "Retry-After": "1",
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Interceptor
// ---------------------------------------------------------------------------

/**
 * Intercepta uma chamada fetch à API do GitHub.
 * Retorna null quando não há mock ativo (deixa o fetch real prosseguir).
 *
 * @param {string} path   Caminho relativo (ex: "/user/following/octocat")
 * @param {string} method
 * @returns {Promise<Response|null>}
 */
export async function mockFetch(path, method = "GET") {
  if (!IS_DEV_MODE) return null;

  const cfg = await getConfig();
  if (!cfg.enabled || !cfg.scenario) return null;

  // Latência simulada
  if (cfg.latency > 0) {
    await new Promise((r) => setTimeout(r, cfg.latency));
  }

  const mock = buildResponse(cfg.scenario, path);
  if (!mock) return null;

  // Falha de rede / timeout — lança exceção (não retorna Response)
  if (mock.isNetwork) {
    const err = new TypeError("Failed to fetch");
    err.isNetworkError = true;
    throw err;
  }
  if (mock.isTimeout) {
    const err = new Error("A requisição excedeu o tempo limite. Verifique sua conexão.");
    err.name = "TimeoutError";
    throw err;
  }

  // Resposta HTML no lugar de JSON (reproduz o incidente real)
  if (mock.isHtml) {
    return new Response(mock.data, {
      status: mock.status,
      headers: fakeHeaders({ "Content-Type": "text/html; charset=utf-8" }),
    });
  }

  // Resposta normal (JSON)
  const body = method === "DELETE" || mock.status === 204
    ? null
    : JSON.stringify(mock.data);

  return new Response(body, {
    status: mock.status,
    headers: fakeHeaders(),
  });
}
