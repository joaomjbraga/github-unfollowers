const GH = "https://api.github.com";

// Chaves compartilhadas com o popup (src/app.js). Precisam ser as MESMAS,
// senão o background e o popup ficam comparando contra baselines diferentes
// e o badge do ícone nunca reflete o que o usuário vê na lista.
const SNAPSHOT_KEYS = {
  unfollowers: "snapshot_unfollowers",
  notFollowingBack: "snapshot_not_following_back",
  mutuals: "snapshot_mutuals",
  initialized: "snapshot_initialized",
};

function ensureAlarm() {
  // 1 minuto é o mínimo que o Chrome aceita sem reclamar (chrome.alarms
  // clampa qualquer período menor pra 1 min em extensões publicadas).
  // Isso já dá ~60 checagens/hora, bem dentro do limite de 5000 req/hora
  // da API do GitHub autenticada (cada checagem usa só 2-3 requisições
  // na maioria dos casos, por causa do cache de ETag).
  chrome.alarms.create("check", { periodInMinutes: 1 });
  // Não espera o primeiro alarme disparar: checa agora mesmo.
  checkForChanges();
}

// onInstalled só dispara em instalação/atualização da extensão.
// onStartup garante que o alarme também sobrevive caso seja perdido
// (ex: perfil corrompido, alarme limpo manualmente, etc).
chrome.runtime.onInstalled.addListener(ensureAlarm);
chrome.runtime.onStartup.addListener(ensureAlarm);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "check") checkForChanges();
});

chrome.notifications.onClicked.addListener(() => {
  chrome.action.openPopup();
});

function get(key) {
  return new Promise((r) => chrome.storage.local.get([key], (res) => r(res[key] || null)));
}

function set(key, val) {
  return new Promise((r) => chrome.storage.local.set({ [key]: val }, r));
}

async function ghFetch(path, token) {
  const res = await fetch(`${GH}${path}?per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

async function fetchAllPages(path, token) {
  const results = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${GH}${path}?per_page=100&page=${page}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "60", 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return results;
}

function compute({ followers, following }) {
  const fLogins = new Set(followers.map((u) => u.login));
  const gLogins = new Set(following.map((u) => u.login));
  return {
    unfollowers: following.filter((u) => !fLogins.has(u.login)),
    notFollowingBack: followers.filter((u) => !gLogins.has(u.login)),
    mutuals: following.filter((u) => fLogins.has(u.login)),
  };
}

function showNotification(changes) {
  const parts = [];
  if (changes.unfollowers > 0) {
    parts.push(`${changes.unfollowers} ${changes.unfollowers === 1 ? "pessoa parou" : "pessoas pararam"} de te seguir`);
  }
  if (changes.notFollowingBack > 0) {
    parts.push(`${changes.notFollowingBack} novo${changes.notFollowingBack !== 1 ? "s" : ""} seguidor${changes.notFollowingBack !== 1 ? "es" : ""} que você não segue`);
  }
  if (changes.mutuals > 0) {
    parts.push(`${changes.mutuals} novo${changes.mutuals !== 1 ? "s" : ""} seguidor${changes.mutuals !== 1 ? "es" : ""} mútuo${changes.mutuals !== 1 ? "s" : ""}`);
  }

  let message;
  if (parts.length === 1) message = parts[0];
  else if (parts.length === 2) message = `${parts[0]} e ${parts[1]}`;
  else message = `${parts[0]}, ${parts[1]} e ${parts[2]}`;

  const total = changes.unfollowers + changes.notFollowingBack + changes.mutuals;

  chrome.action.setBadgeText({ text: String(total) });
  chrome.action.setBadgeBackgroundColor({ color: "#da3633" });

  chrome.notifications.create("gh-unfollowers", {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "GitHub Unfollowers",
    message,
    priority: 2,
  });
}

async function checkForChanges() {
  const token = await get("gh_token");
  if (!token) return;

  let user;
  try {
    user = await ghFetch("/user", token);
    if (!user) return;
  } catch {
    return;
  }

  let following, followers;
  try {
    [following, followers] = await Promise.all([
      fetchAllPages(`/users/${user.login}/following`, token),
      fetchAllPages(`/users/${user.login}/followers`, token),
    ]);
    if (!following || !followers) return;
  } catch {
    return;
  }

  const { unfollowers, notFollowingBack, mutuals } = compute({ followers, following });

  const prevU = (await get(SNAPSHOT_KEYS.unfollowers)) || [];
  const prevN = (await get(SNAPSHOT_KEYS.notFollowingBack)) || [];
  const prevM = (await get(SNAPSHOT_KEYS.mutuals)) || [];
  const initialized = (await get(SNAPSHOT_KEYS.initialized)) || false;

  const newU = unfollowers.filter((u) => !prevU.includes(u.login));
  const newN = notFollowingBack.filter((u) => !prevN.includes(u.login));
  const newM = mutuals.filter((u) => !prevM.includes(u.login));

  await set(SNAPSHOT_KEYS.unfollowers, unfollowers.map((u) => u.login));
  await set(SNAPSHOT_KEYS.notFollowingBack, notFollowingBack.map((u) => u.login));
  await set(SNAPSHOT_KEYS.mutuals, mutuals.map((u) => u.login));
  await set(SNAPSHOT_KEYS.initialized, true);

  // Sem baseline ainda (primeira vez que QUALQUER lado - popup ou background -
  // roda) não há "novidade" real para notificar, só a foto inicial.
  if (!initialized) return;

  if (newU.length === 0 && newN.length === 0 && newM.length === 0) return;

  showNotification({ unfollowers: newU.length, notFollowingBack: newN.length, mutuals: newM.length });
}
