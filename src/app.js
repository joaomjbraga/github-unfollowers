import * as api from "./api.js";
import { $ } from "./dom.js";
import { resetState, state } from "./store.js";
import { setStorageMulti, removeStorage, getStorage, setStorage } from "./storage.js";
import * as ui from "./ui.js";
import { computeRelationshipLists, sleep } from "./utils.js";
import { STORAGE_KEYS, AUTO_REFRESH_MS } from "./constants.js";
import { addEvent, loadHistory, clearHistory } from "./history.js";
import { loadWhitelist, addToWhitelist, removeFromWhitelist } from "./whitelist.js";
import { initTheme, toggleTheme, applyTheme, saveTheme } from "./theme.js";

const { snapshots: SNAP, pending: PEND, cachedLists: CACHED_LISTS_KEY, massActionProgress: MASS_ACTION_KEY } = STORAGE_KEYS;

// ---------------------------------------------------------------------------
// Elementos DOM
// ---------------------------------------------------------------------------

const tokenInput = $("token-input");
const btnConnect = $("btn-connect");
const btnCreateToken = $("btn-create-token");
const searchInput = $("search-input");
const sortSelect = $("sort-select");
const btnUnfollowAll = $("btn-unfollow-all");
const btnFollowAll = $("btn-follow-all");
const btnCancelMass = $("btn-cancel-mass");
const modalOverlay = $("modal-overlay");
const modalCount = $("modal-count");
const modalConfirm = $("modal-confirm");
const modalCancel = $("modal-cancel");
const modalTitle = $("modal-title");
const modalText = $("modal-text");
const modalIcon = document.querySelector(".modal-icon");

// ---------------------------------------------------------------------------
// Estado da aplicação (extensões ao store)
// ---------------------------------------------------------------------------

/** @type {Set<string>} */
state.whitelist = new Set();
/** @type {"dark"|"light"} */
let currentTheme = "dark";

// ---------------------------------------------------------------------------
// Auto-refresh
// ---------------------------------------------------------------------------

let refreshTimer = null;
let searchTimeout = null;

function clearAutoRefresh() {
  if (refreshTimer !== null) { clearInterval(refreshTimer); refreshTimer = null; }
}

function scheduleAutoRefresh() {
  clearAutoRefresh();
  refreshTimer = window.setInterval(async () => {
    if (!state.token || !state.user) return;
    await refreshUserData({ silent: true }).catch(() => {});
  }, AUTO_REFRESH_MS);
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function setUserHeader(user) {
  $("header-user").href = `https://github.com/${user.login}`;
  $("header-login").textContent = user.login;
  $("header-avatar").src = user.avatar_url;
  $("header-followers").textContent = user.followers.toLocaleString("pt-BR");
}

function setTabSelected(container, activeEl) {
  container.querySelectorAll("[role='tab']").forEach((t) => {
    const isActive = t === activeEl;
    t.classList.toggle("active", isActive);
    t.setAttribute("aria-selected", String(isActive));
    t.tabIndex = isActive ? 0 : -1;
  });
}

function resetViewState() {
  state.activeTab = "all";
  state.query = "";
  state.sortBy = "default";
  searchInput.value = "";
  sortSelect.value = "default";
  $("list-label").textContent = "Não te seguem de volta";
  setTabSelected($("results-state").querySelector(".tabs"), $("tab-all"));
  showMainTab("results");
}

// ---------------------------------------------------------------------------
// Sub-telas dentro da tela principal
// ---------------------------------------------------------------------------

function showMainTab(tab) {
  // tab: "results" | "history" | "whitelist"
  $("results-state").classList.toggle("hidden", tab !== "results");
  $("history-state").classList.toggle("hidden", tab !== "history");
  $("whitelist-state").classList.toggle("hidden", tab !== "whitelist");
  $("loading-state").classList.add("hidden");
  $("error-state").classList.add("hidden");

  setTabSelected($("nav-bar"), $(`nav-tab-${tab}`));

  if (tab === "history") renderHistoryTab();
  if (tab === "whitelist") renderWhitelistTab();
}

async function renderHistoryTab() {
  const events = await loadHistory();
  ui.renderHistory(events);
}

async function renderWhitelistTab() {
  const allUsers = [...state.following, ...state.followers];
  ui.renderWhitelistManager(state.whitelist, allUsers);

  // Bind remove buttons
  $("whitelist-list").querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const login = btn.dataset.remove;
      await removeFromWhitelist(login);
      state.whitelist.delete(login);
      renderWhitelistTab();
      ui.renderList(state, makeListActions());
    });
  });
}

// ---------------------------------------------------------------------------
// Modal de confirmação
// ---------------------------------------------------------------------------

function showModal({ count, isFollow }) {
  return new Promise((resolve) => {
    modalCount.textContent = count;
    modalTitle.textContent = isFollow ? "Seguir de volta?" : "Deixar de seguir?";
    modalText.innerHTML = isFollow
      ? `Você está prestes a seguir <strong>${count}</strong> usuário(s) que te seguem.`
      : `Você está prestes a deixar de seguir <strong>${count}</strong> usuário(s) que não te seguem de volta.`;
    modalConfirm.textContent = isFollow ? "Sim, seguir" : "Sim, deixar de seguir";
    if (modalIcon) modalIcon.style.color = isFollow ? "var(--accent-emphasis)" : "var(--danger-hover)";

    modalOverlay.classList.remove("hidden");
    modalConfirm.disabled = false;
    modalCancel.disabled = false;

    const focusable = [modalCancel, modalConfirm];
    const trapTab = (e) => {
      if (e.key !== "Tab") return;
      e.preventDefault();
      const idx = focusable.indexOf(document.activeElement);
      const next = focusable[(idx + (e.shiftKey ? -1 : 1) + 2) % 2];
      next.focus();
    };
    document.addEventListener("keydown", trapTab);
    modalCancel.focus();

    const cleanup = () => {
      modalConfirm.removeEventListener("click", onConfirm);
      modalCancel.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", trapTab);
      modalOverlay.classList.add("hidden");
    };
    const onConfirm = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    modalConfirm.addEventListener("click", onConfirm);
    modalCancel.addEventListener("click", onCancel);
  });
}

// ---------------------------------------------------------------------------
// Painel de perfil
// ---------------------------------------------------------------------------

function makeListActions() {
  return {
    followUser,
    unfollowUser,
    onOpenProfile: handleOpenProfile,
    whitelist: state.whitelist,
  };
}

async function handleOpenProfile(user, mode) {
  // Modo "whitelist" — toggle direto sem abrir painel
  if (mode === "whitelist") {
    await handleWhitelistToggle(user.login);
    return;
  }

  // Abre painel e busca dados extras
  const { isWhitelisted } = ui.openProfilePanel(user, {
    whitelist: state.whitelist,
    onWhitelistToggle: handleWhitelistToggle,
  });

  // Busca dados detalhados + repos em paralelo
  try {
    const [fullUser, repos] = await Promise.all([
      api.ghFetch(`/users/${user.login}`),
      api.ghFetch(`/users/${user.login}/repos?sort=stars&per_page=5`),
    ]);
    ui.openProfilePanel(fullUser, { whitelist: state.whitelist });
    ui.renderProfileRepos(repos);
  } catch {
    ui.renderProfileRepos([]);
  }

  // Bind botão whitelist dentro do painel
  $("profile-whitelist-btn").onclick = async () => {
    await handleWhitelistToggle(user.login);
    // Reatualiza o painel
    const updated = state.whitelist.has(user.login);
    const wlBtn = $("profile-whitelist-btn");
    wlBtn.classList.toggle("is-whitelisted", updated);
    wlBtn.innerHTML = updated
      ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.751.751 0 0 1 3 14.25Z"/></svg> <span>Remover da whitelist</span>`
      : `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.751.751 0 0 1 3 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.91l3.023-2.489a.75.75 0 0 1 .954 0L11.5 12.41V2.75a.25.25 0 0 0-.25-.25Z"/></svg> <span>Ignorar sempre</span>`;
  };
}

async function handleWhitelistToggle(login) {
  if (state.whitelist.has(login)) {
    await removeFromWhitelist(login);
    state.whitelist.delete(login);
  } else {
    await addToWhitelist(login);
    state.whitelist.add(login);
  }
  ui.renderList(state, makeListActions());
}

// ---------------------------------------------------------------------------
// Carregamento de dados
// ---------------------------------------------------------------------------

async function refreshUserData({ silent = false } = {}) {
  if (!silent) {
    ui.showLoading("Obtendo seu perfil...");
    ui.setProgress(5);
  }

  try {
    if (!state.user) state.user = await api.fetchUser();
    setUserHeader(state.user);
    if (!silent) ui.setProgress(15);

    if (!silent) ui.showLoading("Carregando lista de seguindo...");
    state.following = await api.fetchFollowing(state.user.login);
    if (!silent) ui.setProgress(50);

    if (!silent) ui.showLoading("Carregando lista de seguidores...");
    state.followers = await api.fetchFollowers(state.user.login);
    if (!silent) ui.setProgress(90);

    if (!silent) ui.showLoading("Calculando...");
    Object.assign(state, computeRelationshipLists({ followers: state.followers, following: state.following }));

    const [pendingU, pendingN, pendingM, prevU, prevN, prevM, initialized] = await Promise.all([
      getStorage(PEND.unfollowers),
      getStorage(PEND.notFollowingBack),
      getStorage(PEND.mutuals),
      getStorage(SNAP.unfollowers),
      getStorage(SNAP.notFollowingBack),
      getStorage(SNAP.mutuals),
      getStorage(SNAP.initialized),
    ]);

    if (initialized) {
      const ownU = new Set(state.unfollowers.map((u) => u.login).filter((l) => !(prevU || []).includes(l)));
      const ownN = new Set(state.notFollowingBack.map((u) => u.login).filter((l) => !(prevN || []).includes(l)));
      const ownM = new Set(state.mutuals.map((u) => u.login).filter((l) => !(prevM || []).includes(l)));

      const newU = new Set([...(pendingU || []), ...ownU]);
      const newN = new Set([...(pendingN || []), ...ownN]);
      const newM = new Set([...(pendingM || []), ...ownM]);

      state.newUnfollowers = state.unfollowers.filter((u) => newU.has(u.login));
      state.newNotFollowingBack = state.notFollowingBack.filter((u) => newN.has(u.login));
      state.newMutuals = state.mutuals.filter((u) => newM.has(u.login));

      // Registra no histórico (apenas novidades desta sessão)
      const prevUSet = new Set(prevU || []);
      const prevNSet = new Set(prevN || []);
      for (const u of state.unfollowers) {
        if (!prevUSet.has(u.login)) {
          await addEvent({ type: "unfollowed", login: u.login, avatar_url: u.avatar_url });
        }
      }
      for (const u of state.notFollowingBack) {
        if (!prevNSet.has(u.login)) {
          await addEvent({ type: "followed", login: u.login, avatar_url: u.avatar_url });
        }
      }
    } else {
      state.newUnfollowers = [];
      state.newNotFollowingBack = [];
      state.newMutuals = [];
    }

    await setStorageMulti({
      [CACHED_LISTS_KEY]: {
        following: state.following, followers: state.followers,
        unfollowers: state.unfollowers, notFollowingBack: state.notFollowingBack,
        mutuals: state.mutuals, ts: Date.now(),
      },
      [PEND.unfollowers]: [], [PEND.notFollowingBack]: [], [PEND.mutuals]: [],
      [SNAP.unfollowers]: state.unfollowers.map((u) => u.login),
      [SNAP.notFollowingBack]: state.notFollowingBack.map((u) => u.login),
      [SNAP.mutuals]: state.mutuals.map((u) => u.login),
      [SNAP.initialized]: true,
    });

    if (!silent) {
      ui.setProgress(100);
      ui.showResults();
      scheduleAutoRefresh();
    }
    ui.updateStats(state);
    ui.renderList(state, makeListActions());
    api.persistCache().catch(() => {});
  } catch (e) {
    if (e.isAuthError) {
      ui.showConnectError("Sessão expirada. Seu token foi removido. Faça login novamente.");
      ui.showToken();
    } else {
      ui.showError(e.message);
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Follow / Unfollow individuais
// ---------------------------------------------------------------------------

async function unfollowUser(login) {
  const item = $("user-list").querySelector(`[data-login="${login}"]`);
  const button = item?.querySelector("[data-action='unfollow']");
  if (button) { button.disabled = true; button.textContent = "..."; }

  try {
    await api.ghFetch(`/user/following/${login}`, "DELETE");

    const userData = state.following.find((u) => u.login === login);
    state.following = state.following.filter((u) => u.login !== login);
    state.unfollowers = state.unfollowers.filter((u) => u.login !== login);
    state.mutuals = state.mutuals.filter((u) => u.login !== login);

    const wasFollower = state.followers.find((u) => u.login === login);
    if (wasFollower && !state.notFollowingBack.some((u) => u.login === login)) {
      state.notFollowingBack = [...state.notFollowingBack, wasFollower];
    }

    if (userData) {
      await addEvent({ type: "unfollowed", login: userData.login, avatar_url: userData.avatar_url });
    }

    ui.removeUserItem(login);
    ui.updateStats(state);
    ui.renderList(state, makeListActions());
    return true;
  } catch (e) {
    if (button) { button.disabled = false; button.textContent = "Deixar de seguir"; }
    ui.showError(`Erro ao deixar de seguir ${login}: ${e.message}`);
    return false;
  }
}

async function followUser(login) {
  const item = $("user-list").querySelector(`[data-login="${login}"]`);
  const button = item?.querySelector("[data-action='follow']");
  if (button) { button.disabled = true; button.textContent = "..."; }

  try {
    await api.ghFetch(`/user/following/${login}`, "PUT");

    const userData = state.notFollowingBack.find((u) => u.login === login);
    state.notFollowingBack = state.notFollowingBack.filter((u) => u.login !== login);
    if (userData) {
      state.following = [...state.following, userData];
      state.mutuals = [...state.mutuals, userData];
      await addEvent({ type: "followed", login: userData.login, avatar_url: userData.avatar_url });
    }

    ui.removeUserItem(login);
    ui.updateStats(state);
    ui.renderList(state, makeListActions());
    return true;
  } catch (e) {
    if (button) { button.disabled = false; button.textContent = "Seguir"; }
    ui.showError(`Erro ao seguir ${login}: ${e.message}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Ações em massa
// ---------------------------------------------------------------------------

function saveMassActionProgress({ actionType, totalCount, pendingLogins }) {
  return setStorageMulti({ [MASS_ACTION_KEY]: { actionType, totalCount, pendingLogins } });
}

function clearMassActionProgress() {
  return removeStorage(MASS_ACTION_KEY);
}

async function runMassAction({ actionType, items, actionFn, button, otherButton, processingLabel, idleLabel, totalCountOverride }) {
  if (state.isProcessing) return;
  state.isProcessing = true;
  state.cancelMassAction = false;

  const totalCount = totalCountOverride ?? items.length;
  let done = totalCount - items.length;

  button.disabled = true;
  otherButton.disabled = true;
  btnCancelMass.classList.remove("hidden");
  btnCancelMass.disabled = false;
  btnCancelMass.textContent = "Cancelar";
  button.textContent = `${processingLabel} (${done}/${totalCount})`;

  let pending = [...items];
  await saveMassActionProgress({ actionType, totalCount, pendingLogins: pending.map((u) => u.login) }).catch(() => {});

  for (const user of items) {
    if (state.cancelMassAction) break;
    const succeeded = await actionFn(user.login);
    if (succeeded) done++;
    pending = pending.slice(1);
    button.textContent = `${processingLabel} (${done}/${totalCount})`;
    await saveMassActionProgress({ actionType, totalCount, pendingLogins: pending.map((u) => u.login) }).catch(() => {});
    const delay = Math.max(api.getRateLimitDelay(), 200);
    if (delay > 0) await sleep(delay);
  }

  const wasCancelled = state.cancelMassAction && done < totalCount;
  state.isProcessing = false;
  state.cancelMassAction = false;
  otherButton.disabled = false;
  btnCancelMass.classList.add("hidden");
  await clearMassActionProgress().catch(() => {});

  if (wasCancelled) {
    button.textContent = `Cancelado (${done}/${totalCount})`;
    await sleep(1500);
  }
  button.disabled = false;
  button.textContent = idleLabel;
}

async function handleUnfollowAll() {
  // Exclui whitelisted da ação em massa
  const toUnfollow = state.unfollowers.filter((u) => !state.whitelist.has(u.login));
  if (toUnfollow.length === 0) return;
  const confirmed = await showModal({ count: toUnfollow.length, isFollow: false });
  if (!confirmed) return;
  await runMassAction({
    actionType: "unfollow", items: toUnfollow, actionFn: unfollowUser,
    button: btnUnfollowAll, otherButton: btnFollowAll,
    processingLabel: "Processando", idleLabel: "Parar de seguir todos",
  });
}

async function handleFollowAll() {
  if (state.notFollowingBack.length === 0) return;
  const confirmed = await showModal({ count: state.notFollowingBack.length, isFollow: true });
  if (!confirmed) return;
  await runMassAction({
    actionType: "follow", items: [...state.notFollowingBack], actionFn: followUser,
    button: btnFollowAll, otherButton: btnUnfollowAll,
    processingLabel: "Processando", idleLabel: "Seguir todos",
  });
}

async function resumePendingMassAction() {
  const progress = await getStorage(MASS_ACTION_KEY);
  if (!progress?.pendingLogins?.length) return;

  const { actionType, totalCount, pendingLogins } = progress;
  const isFollow = actionType === "follow";
  const sourceList = isFollow ? state.notFollowingBack : state.unfollowers;
  const pendingSet = new Set(pendingLogins);
  const items = sourceList.filter((u) => pendingSet.has(u.login));

  if (items.length === 0) { await clearMassActionProgress().catch(() => {}); return; }

  const confirmed = await showModal({ count: items.length, isFollow });
  if (!confirmed) { await clearMassActionProgress().catch(() => {}); return; }

  await runMassAction({
    actionType, items,
    actionFn: isFollow ? followUser : unfollowUser,
    button: isFollow ? btnFollowAll : btnUnfollowAll,
    otherButton: isFollow ? btnUnfollowAll : btnFollowAll,
    processingLabel: "Retomando",
    idleLabel: isFollow ? "Seguir todos" : "Parar de seguir todos",
    totalCountOverride: totalCount,
  });
}

function handleCancelMassAction() {
  state.cancelMassAction = true;
  btnCancelMass.disabled = true;
  btnCancelMass.textContent = "Cancelando...";
}

// ---------------------------------------------------------------------------
// Event handlers de navegação
// ---------------------------------------------------------------------------

const TAB_LABELS = {
  all: "Não te seguem de volta",
  mutual: "Seguidores mútuos",
  "not-following-back": "Quem segue você",
};

function handleTabClick(event) {
  const tab = event.currentTarget;
  setTabSelected(tab.closest(".tabs"), tab);
  state.activeTab = tab.dataset.tab;
  state.query = "";
  searchInput.value = "";
  $("list-label").textContent = TAB_LABELS[state.activeTab] ?? "";
  ui.renderList(state, makeListActions());
}

function handleSortChange(event) {
  state.sortBy = event.target.value;
  ui.renderList(state, makeListActions());
}

function handleSearchInput(event) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.query = event.target.value.trim();
    ui.renderList(state, makeListActions());
  }, 200);
}

async function handleRefresh() {
  api.clearCache();
  state.user = null;
  resetViewState();
  chrome.action.setBadgeText({ text: "" });
  await refreshUserData();
}

async function handleLogout() {
  await removeStorage(STORAGE_KEYS.token);
  await clearMassActionProgress().catch(() => {});
  api.clearCache();
  clearAutoRefresh();
  resetState();
  state.whitelist = new Set();
  btnCancelMass.classList.add("hidden");
  tokenInput.value = "";
  ui.closeProfilePanel();
  ui.showToken();
}

// ---------------------------------------------------------------------------
// Atalhos de teclado
// ---------------------------------------------------------------------------

function bindKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Ignora quando foco está em input/select
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
      if (e.key === "Escape") document.activeElement.blur();
      return;
    }

    if (e.key === "Escape") {
      if (ui.isPanelOpen()) { ui.closeProfilePanel(); return; }
      if (!modalOverlay.classList.contains("hidden")) { modalCancel.click(); return; }
    }

    // Só ativa atalhos de tab quando a tela principal está visível
    if ($("screen-main").classList.contains("hidden")) return;

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const tab = e.target.closest("[role='tab']");
      if (tab) {
        e.preventDefault();
        const tablist = tab.closest("[role='tablist']");
        const tabs = [...tablist.querySelectorAll("[role='tab']")];
        const idx = tabs.indexOf(tab);
        const next = tabs[(idx + (e.key === "ArrowLeft" ? -1 : 1) + tabs.length) % tabs.length];
        next.click();
        next.focus();
        return;
      }
    }

    if (e.key === "1") document.querySelector('.tab[data-tab="all"]')?.click();
    else if (e.key === "2") document.querySelector('.tab[data-tab="not-following-back"]')?.click();
    else if (e.key === "3") document.querySelector('.tab[data-tab="mutual"]')?.click();
    else if (e.key === "/") { e.preventDefault(); searchInput.focus(); }
    else if (e.key === "h" || e.key === "H") $("nav-tab-history")?.click();
    else if (e.key === "w" || e.key === "W") $("nav-tab-whitelist")?.click();
    else if (e.key === "r" || e.key === "R") $("nav-tab-results")?.click();
    else if (e.key === "t" || e.key === "T") $("btn-theme")?.click();
  });
}

// ---------------------------------------------------------------------------
// Conexão
// ---------------------------------------------------------------------------

const CONNECT_BTN_HTML = `
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1 5.25A2.25 2.25 0 0 1 3.25 3h9.5A2.25 2.25 0 0 1 15 5.25v5.5A2.25 2.25 0 0 1 12.75 13h-9.5A2.25 2.25 0 0 1 1 10.75ZM3.25 4.5a.75.75 0 0 0-.75.75v.128l5.5 3.589 5.5-3.59V5.25a.75.75 0 0 0-.75-.75Zm9.25 2.867-4.215 2.748a1.75 1.75 0 0 1-1.87-.001L2.5 7.367v3.383c0 .414.336.75.75.75h9.5a.75.75 0 0 0 .75-.75Z"/>
  </svg> Conectar`;

async function handleConnect() {
  const token = tokenInput.value.trim();
  if (!token) return ui.showConnectError("Cole seu Personal Access Token acima.");

  btnConnect.disabled = true;
  btnConnect.textContent = "Verificando...";
  $("connect-error").classList.add("hidden");

  try {
    state.token = token;
    const user = await api.fetchUser();
    await setStorage(STORAGE_KEYS.token, token);
    state.user = user;
    ui.showMain();
    await refreshUserData();
  } catch (e) {
    state.token = null;
    if (e.isAuthError) {
      ui.showConnectError("Token inválido ou expirado. Gere um novo token.");
      ui.showToken();
    } else {
      ui.showConnectError(`Erro: ${e.message}`);
    }
  } finally {
    btnConnect.disabled = false;
    btnConnect.innerHTML = CONNECT_BTN_HTML;
  }
}

// ---------------------------------------------------------------------------
// Registro de eventos
// ---------------------------------------------------------------------------

function bindEventListeners() {
  btnConnect.addEventListener("click", handleConnect);
  tokenInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleConnect(); }
  });
  btnCreateToken.addEventListener("click", () => {
    window.open(
      "https://github.com/settings/tokens/new?description=GitHub+Unfollowers&scopes=read:user,user:follow",
      "_blank",
    );
  });

  btnUnfollowAll.addEventListener("click", handleUnfollowAll);
  btnFollowAll.addEventListener("click", handleFollowAll);
  btnCancelMass.addEventListener("click", handleCancelMassAction);

  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", handleTabClick));
  searchInput.addEventListener("input", handleSearchInput);
  sortSelect.addEventListener("change", handleSortChange);
  $("btn-refresh").addEventListener("click", handleRefresh);
  $("btn-logout").addEventListener("click", handleLogout);

  // Tema
  $("btn-theme").addEventListener("click", async () => {
    currentTheme = toggleTheme(currentTheme);
    applyTheme(currentTheme);
    await saveTheme(currentTheme);
  });

  // Navegação entre sub-telas
  $("nav-tab-results").addEventListener("click", () => showMainTab("results"));
  $("nav-tab-history").addEventListener("click", () => showMainTab("history"));
  $("nav-tab-whitelist").addEventListener("click", () => showMainTab("whitelist"));

  // Limpar histórico
  $("btn-clear-history").addEventListener("click", async () => {
    await clearHistory();
    renderHistoryTab();
  });

  // Painel de perfil — fechar
  $("profile-close").addEventListener("click", () => ui.closeProfilePanel());
  $("profile-overlay").addEventListener("click", () => ui.closeProfilePanel());

  bindKeyboardShortcuts();
}

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------

async function init() {
  chrome.action.setBadgeText({ text: "" });
  currentTheme = await initTheme();
  bindEventListeners();
  await api.initCache();

  // Carrega whitelist antes de qualquer render
  state.whitelist = await loadWhitelist();

  const token = await getStorage(STORAGE_KEYS.token);
  if (!token) { ui.showToken(); return; }

  state.token = token;

  try {
    state.user = await api.fetchUser();
    ui.showMain();

    const cached = await getStorage(CACHED_LISTS_KEY);
    if (cached?.unfollowers) {
      Object.assign(state, {
        following: cached.following || [],
        followers: cached.followers || [],
        unfollowers: cached.unfollowers,
        notFollowingBack: cached.notFollowingBack || [],
        mutuals: cached.mutuals || [],
        newUnfollowers: [],
        newNotFollowingBack: [],
        newMutuals: [],
      });
      ui.updateStats(state);
      ui.renderList(state, makeListActions());
      ui.showResults();
    }

    await refreshUserData({ silent: !!cached });
    resumePendingMassAction().catch(() => {});
  } catch (e) {
    state.token = null;
    if (e.isAuthError) {
      ui.showConnectError("Token salvo expirou ou foi revogado. Gere um novo.");
      ui.showToken();
    } else {
      ui.showError(e.message);
    }
  }
}

init();
