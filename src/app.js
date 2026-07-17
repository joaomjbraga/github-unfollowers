import * as api from "./api.js";
import { $ } from "./dom.js";
import { resetState, state } from "./store.js";
import { setStorageMulti, removeStorage, getStorage, setStorage } from "./storage.js";
import * as ui from "./ui.js";
import { computeRelationshipLists, sleep } from "./utils.js";
import { STORAGE_KEYS, AUTO_REFRESH_MS, IS_DEV_MODE } from "./constants.js";
import { addEvent, loadHistory, clearHistory, HISTORY_STORAGE_KEY } from "./history.js";
import { loadWhitelist, addToWhitelist, removeFromWhitelist, WHITELIST_STORAGE_KEY } from "./whitelist.js";
import { initTheme, toggleTheme, applyTheme, saveTheme } from "./theme.js";
import { getConfig, setConfig, getScenarios } from "./dev.js";

const { snapshots: SNAP, pending: PEND, cachedLists: CACHED_LISTS_KEY, massActionProgress: MASS_ACTION_KEY, unfollowableLogins: UNFOLLOWABLE_KEY } = STORAGE_KEYS;

// ---------------------------------------------------------------------------
// Elementos DOM
// ---------------------------------------------------------------------------

const tokenInput = $("token-input");
const btnConnect = $("btn-connect");
const btnCreateToken = $("btn-create-token");
const searchInput = $("search-input");
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
    if (!state.token || !state.user || state.isProcessing) return;
    await refreshUserData({ silent: true }).catch(() => {});
  }, AUTO_REFRESH_MS);
}

// ---------------------------------------------------------------------------
// Unfollowable (perfis privados / restrições)
// ---------------------------------------------------------------------------

/** @param {string[]} logins */
async function addUnfollowable(logins) {
  if (!logins.length) return;
  for (const l of logins) state.unfollowable.add(l);
  await setStorage(UNFOLLOWABLE_KEY, [...state.unfollowable]);
}

async function loadUnfollowable() {
  const raw = await getStorage(UNFOLLOWABLE_KEY);
  state.unfollowable = new Set(Array.isArray(raw) ? raw : []);
}

/** Persite as listas de relacionamento no storage para que reabrir a extensão reflita o estado atual. */
async function persistState() {
  await setStorageMulti({
    [CACHED_LISTS_KEY]: {
      following: state.following, followers: state.followers,
      unfollowers: state.unfollowers, notFollowingBack: state.notFollowingBack,
      mutuals: state.mutuals, ts: Date.now(),
    },
  });
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function setUserHeader(user) {
  $("header-user").href = `https://github.com/${user.login}`;
  $("header-login").textContent = user.login;
  $("header-avatar").src = user.avatar_url;
  $("header-followers").textContent = (user.followers ?? 0).toLocaleString("pt-BR");
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

  if (tab === "history") renderHistoryTab().catch(() => {});
  if (tab === "whitelist") renderWhitelistTab().catch(() => {});
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
// Modal de confirmação genérico
// ---------------------------------------------------------------------------

function showConfirmModal({ title, message, confirmText, confirmClass = "btn-primary", iconColor }) {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalText.innerHTML = message;
    modalCount.textContent = "";
    modalConfirm.textContent = confirmText;
    modalConfirm.className = `btn ${confirmClass} modal-confirm`;
    if (modalIcon) modalIcon.style.color = iconColor || "";

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
    followUser: handleFollowUser,
    unfollowUser,
    onOpenProfile: handleOpenProfile,
    whitelist: state.whitelist,
  };
}

/** Wrapper: follow individual com pós-processamento de state */
async function handleFollowUser(login) {
  const result = await followUser(login);
  if (!result.succeeded) return;

  const userData = state.notFollowingBack.find((u) => u.login === login);
  state.notFollowingBack = state.notFollowingBack.filter((u) => u.login !== login);
  if (userData) {
    state.following = [...state.following, userData];
    state.mutuals = [...state.mutuals, userData];
    await addEvent({ type: "followed", login: userData.login, avatar_url: userData.avatar_url });
  }
  ui.updateStats(state);
  ui.renderList(state, makeListActions());
  await persistState();
}

async function handleOpenProfile(user, mode) {
  // Modo "whitelist" — toggle direto sem abrir painel
  if (mode === "whitelist") {
    await handleWhitelistToggle(user.login);
    return;
  }

  // Abre painel e busca dados extras
  ui.openProfilePanel(user, {
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
  ui.updateStats(state);
  ui.renderList(state, makeListActions());
}

// ---------------------------------------------------------------------------
// Carregamento de dados
// ---------------------------------------------------------------------------

let refreshInProgress = false;

async function refreshUserData({ silent = false } = {}) {
  if (refreshInProgress) return;
  refreshInProgress = true;

  if (!silent) {
    ui.showLoading("Obtendo seu perfil...");
    ui.setProgress(5);
  }

  try {
    state.user = await api.fetchUser();
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

    // Recarrega unfollowable do storage (pode ter sido atualizado durante mass action)
    await loadUnfollowable();

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
      const prevUSet = new Set(prevU || []);
      const prevNSet = new Set(prevN || []);
      const prevMSet = new Set(prevM || []);

      const ownU = new Set(state.unfollowers.map((u) => u.login).filter((l) => !prevUSet.has(l)));
      const ownN = new Set(state.notFollowingBack.map((u) => u.login).filter((l) => !prevNSet.has(l)));
      const ownM = new Set(state.mutuals.map((u) => u.login).filter((l) => !prevMSet.has(l)));

      const newU = new Set([...(pendingU || []), ...ownU]);
      const newN = new Set([...(pendingN || []), ...ownN]);
      const newM = new Set([...(pendingM || []), ...ownM]);

      state.newUnfollowers = state.unfollowers.filter((u) => newU.has(u.login));
      state.newNotFollowingBack = state.notFollowingBack.filter((u) => newN.has(u.login));
      state.newMutuals = state.mutuals.filter((u) => newM.has(u.login));

      // Registra no histórico (apenas novidades desta sessão)
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
      ui.showError(e.message, { onRetry: () => refreshUserData() });
    }
    throw e;
  } finally {
    refreshInProgress = false;
  }
}

// ---------------------------------------------------------------------------
// Follow / Unfollow individuais
// ---------------------------------------------------------------------------

async function unfollowUser(login, { skipSideEffects = false } = {}) {
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

    if (!skipSideEffects) {
      ui.removeUserItem(login);
      ui.updateStats(state);
      ui.renderList(state, makeListActions());
      await persistState();
    }
    return { succeeded: true, unfollowable: false };
  } catch (e) {
    if (button) { button.disabled = false; button.textContent = "Deixar de seguir"; }
    ui.showError(`Erro ao deixar de seguir ${login}: ${e.message}`);
    return { succeeded: false, unfollowable: false };
  }
}

async function followUser(login, { skipSideEffects = false } = {}) {
  const item = $("user-list").querySelector(`[data-login="${login}"]`);
  const button = item?.querySelector("[data-action='follow']");
  if (button) { button.disabled = true; button.textContent = "..."; }

  try {
    await api.ghFetch(`/user/following/${login}`, "PUT");

    // Verifica se o follow realmente funcionou.
    // Adiciona delay + retry para evitar falso positivo por propagação eventual do GitHub.
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(1500);
      try {
        await api.ghFetch(`/user/following/${login}`);
        break;
      } catch (verifyErr) {
        if (verifyErr.httpStatus === 404 && attempt === 0) continue;
        if (verifyErr.httpStatus === 404) {
          await addUnfollowable([login]);
          if (!skipSideEffects) {
            const userData = state.notFollowingBack.find((u) => u.login === login);
            if (userData) await addEvent({ type: "unfollowable", login: userData.login, avatar_url: userData.avatar_url });
            ui.updateStats(state);
            ui.renderList(state, makeListActions());
          }
          return { succeeded: false, unfollowable: true };
        }
        // Erros 403/429/etc. na verificação GET não invalidam o follow —
        // o PUT já foi aceito pelo GitHub.
        break;
      }
    }

    ui.removeUserItem(login);
    return { succeeded: true, unfollowable: false };
  } catch (e) {
    if (button) { button.disabled = false; button.textContent = "Seguir"; }

    // 403, 404, 422 = restrição permanente (perfil privado, bloqueado, spam)
    if (e.httpStatus === 403 || e.httpStatus === 404 || e.httpStatus === 422) {
      await addUnfollowable([login]);
      if (!skipSideEffects) {
        const userData = state.notFollowingBack.find((u) => u.login === login);
        if (userData) await addEvent({ type: "unfollowable", login: userData.login, avatar_url: userData.avatar_url });
        ui.updateStats(state);
        ui.renderList(state, makeListActions());
      }
      return { succeeded: false, unfollowable: true };
    }
    // Silencia erros durante ação em massa (apenas individual exibe toast)
    if (!state.isProcessing) {
      ui.showError(`Erro ao seguir ${login}: ${e.message}`);
    }
    return { succeeded: false, unfollowable: false };
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

async function runMassAction({ actionType, items, actionFn, button, otherButton, processingLabel, idleLabel }) {
  if (state.isProcessing) return { succeededLogins: new Set(), attemptedLogins: new Set(), unfollowableLogins: new Set(), done: 0, wasCancelled: false };
  state.isProcessing = true;
  state.cancelMassAction = false;

  const totalCount = items.length;
  let done = totalCount - items.length;
  const succeededLogins = new Set();
  const attemptedLogins = new Set();
  const unfollowableLogins = new Set();

  button.disabled = true;
  otherButton.disabled = true;
  btnCancelMass.classList.remove("hidden");
  btnCancelMass.disabled = false;
  btnCancelMass.textContent = "Cancelar";
  button.textContent = `${processingLabel} (${done}/${totalCount})`;

  await saveMassActionProgress({ actionType, totalCount, pendingLogins: items.map((u) => u.login) }).catch(() => {});

  for (let i = 0; i < items.length; i++) {
    if (state.cancelMassAction) break;
    const user = items[i];
    attemptedLogins.add(user.login);
    const result = await actionFn(user.login, { skipSideEffects: true });
    if (result.succeeded) { done++; succeededLogins.add(user.login); }
    else if (result.unfollowable) { unfollowableLogins.add(user.login); }
    button.textContent = `${processingLabel} (${done}/${totalCount})`;
    await saveMassActionProgress({ actionType, totalCount, pendingLogins: items.slice(i + 1).map((u) => u.login) }).catch(() => {});
    await sleep(Math.max(api.getRateLimitDelay(), 200));
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

  return { succeededLogins, attemptedLogins, unfollowableLogins, done, wasCancelled };
}

async function handleUnfollowAll() {
  // Exclui whitelisted da ação em massa
  const toUnfollow = state.unfollowers.filter((u) => !state.whitelist.has(u.login));
  if (toUnfollow.length === 0) return;

  state.isProcessing = true;
  const confirmed = await showConfirmModal({
    title: "Deixar de seguir?",
    message: `Você está prestes a deixar de seguir <strong>${toUnfollow.length}</strong> usuário(s) que não te seguem de volta.`,
    confirmText: "Sim, deixar de seguir",
    iconColor: "var(--danger-hover)",
  });
  if (!confirmed) {
    state.isProcessing = false;
    return;
  }
  await runMassAction({
    actionType: "unfollow", items: toUnfollow, actionFn: unfollowUser,
    button: btnUnfollowAll, otherButton: btnFollowAll,
    processingLabel: "Processando", idleLabel: "Parar de seguir todos",
  });
}

/** Processa resultado de mass-follow: identifica unfollowable e atualiza state. */
async function processMassFollowResult({ attemptedLogins, succeededLogins, unfollowableLogins }) {
  if (unfollowableLogins.size) {
    await addUnfollowable([...unfollowableLogins]);
    for (const login of unfollowableLogins) {
      const userData = state.notFollowingBack.find((u) => u.login === login);
      if (userData) await addEvent({ type: "unfollowable", login: userData.login, avatar_url: userData.avatar_url });
    }
  }

  const confirmedUsers = state.notFollowingBack.filter((u) => succeededLogins.has(u.login));
  for (const userData of confirmedUsers) {
    state.following = [...state.following, userData];
    state.mutuals = [...state.mutuals, userData];
    await addEvent({ type: "followed", login: userData.login, avatar_url: userData.avatar_url });
  }
  state.notFollowingBack = state.notFollowingBack.filter((u) => !succeededLogins.has(u.login));
  ui.updateStats(state);
  ui.renderList(state, makeListActions());
  await persistState();
}

async function handleFollowAll() {
  const followable = state.notFollowingBack.filter((u) => !state.unfollowable?.has(u.login));
  if (followable.length === 0) return;

  state.isProcessing = true;
  const userConfirmed = await showConfirmModal({
    title: "Seguir de volta?",
    message: `Você está prestes a seguir <strong>${followable.length}</strong> usuário(s) que te seguem.`,
    confirmText: "Sim, seguir",
    iconColor: "var(--accent-emphasis)",
  });
  if (!userConfirmed) {
    state.isProcessing = false;
    return;
  }

  const { succeededLogins, attemptedLogins, unfollowableLogins } = await runMassAction({
    actionType: "follow", items: followable, actionFn: followUser,
    button: btnFollowAll, otherButton: btnUnfollowAll,
    processingLabel: "Processando", idleLabel: "Seguir todos",
  });

  await processMassFollowResult({ attemptedLogins, succeededLogins, unfollowableLogins });
}

async function resumePendingMassAction() {
  const progress = await getStorage(MASS_ACTION_KEY);
  if (!progress?.pendingLogins?.length) return;

  const { actionType, pendingLogins } = progress;
  const isFollow = actionType === "follow";
  const sourceList = isFollow ? state.notFollowingBack : state.unfollowers;
  const pendingSet = new Set(pendingLogins);
  const items = sourceList.filter((u) => pendingSet.has(u.login));

  if (items.length === 0) { await clearMassActionProgress().catch(() => {}); return; }

  state.isProcessing = true;
  const userConfirmed = await showConfirmModal({
    title: isFollow ? "Seguir de volta?" : "Deixar de seguir?",
    message: isFollow
      ? `Você está prestes a seguir <strong>${items.length}</strong> usuário(s) que te seguem.`
      : `Você está prestes a deixar de seguir <strong>${items.length}</strong> usuário(s) que não te seguem de volta.`,
    confirmText: isFollow ? "Sim, seguir" : "Sim, deixar de seguir",
    iconColor: isFollow ? "var(--accent-emphasis)" : "var(--danger-hover)",
  });
  if (!userConfirmed) {
    state.isProcessing = false;
    await clearMassActionProgress().catch(() => {});
    return;
  }

  const { succeededLogins, attemptedLogins, unfollowableLogins } = await runMassAction({
    actionType, items,
    actionFn: isFollow ? followUser : unfollowUser,
    button: isFollow ? btnFollowAll : btnUnfollowAll,
    otherButton: isFollow ? btnUnfollowAll : btnFollowAll,
    processingLabel: "Retomando",
    idleLabel: isFollow ? "Seguir todos" : "Parar de seguir todos",
  });

  if (isFollow) {
    await processMassFollowResult({ attemptedLogins, succeededLogins, unfollowableLogins });
  } else {
    ui.updateStats(state);
    ui.renderList(state, makeListActions());
    await persistState();
  }
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

function handleSearchInput(event) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.query = event.target.value.trim();
    ui.renderList(state, makeListActions());
  }, 200);
}

async function handleRefresh() {
  if (refreshInProgress) return;
  api.clearCache();
  state.user = null;
  resetViewState();
  chrome.action.setBadgeText({ text: "" });
  await refreshUserData();
}

async function handleLogout() {
  await removeStorage([
    STORAGE_KEYS.token,
    UNFOLLOWABLE_KEY,
    CACHED_LISTS_KEY,
    SNAP.unfollowers, SNAP.notFollowingBack, SNAP.mutuals, SNAP.initialized,
    PEND.unfollowers, PEND.notFollowingBack, PEND.mutuals,
  ]);
  await clearMassActionProgress().catch(() => {});
  api.clearCache();
  clearAutoRefresh();
  resetState();
  state.whitelist = new Set();
  state.unfollowable = new Set();
  state.showUnfollowable = false;
  btnCancelMass.classList.add("hidden");
  tokenInput.value = "";
  ui.closeProfilePanel();
  ui.showToken();
}

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

async function handleExport() {
  const [whitelistRaw, historyRaw] = await Promise.all([
    getStorage(WHITELIST_STORAGE_KEY),
    getStorage(HISTORY_STORAGE_KEY),
  ]);
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    whitelist: Array.isArray(whitelistRaw) ? whitelistRaw : [],
    history: Array.isArray(historyRaw) ? historyRaw : [],
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `github-unfollowers-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleImport() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || data.version !== 1 || !Array.isArray(data.whitelist) || !Array.isArray(data.history)) {
        ui.showError("Formato de ficheiro inválido.");
        return;
      }

      const confirmed = await showConfirmModal({
        title: "Importar dados?",
        message: `Importar <strong>${data.whitelist.length}</strong> utilizador(es) na whitelist e <strong>${data.history.length}</strong> evento(s) de histórico.<br><br>Os dados atuais serão substituídos.`,
        confirmText: "Sim, importar",
      });
      if (!confirmed) return;

      await Promise.all([
        setStorage(WHITELIST_STORAGE_KEY, data.whitelist),
        setStorage(HISTORY_STORAGE_KEY, data.history),
      ]);

      state.whitelist = new Set(data.whitelist);

      if (state.user) {
        ui.updateStats(state);
        ui.renderList(state, makeListActions());

        if (!$("whitelist-state").classList.contains("hidden")) renderWhitelistTab();
        if (!$("history-state").classList.contains("hidden")) renderHistoryTab();
      }
    } catch (e) {
      ui.showError("Erro ao importar: " + e.message);
    }
  };
  input.click();
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
      closeMenu();
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
    else if (e.key === "t" || e.key === "T") {
      currentTheme = toggleTheme(currentTheme);
      applyTheme(currentTheme);
      saveTheme(currentTheme);
    }
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
      ui.showConnectError(e.message);
    }
  } finally {
    btnConnect.disabled = false;
    btnConnect.innerHTML = CONNECT_BTN_HTML;
  }
}

// ---------------------------------------------------------------------------
// Menu dropdown
// ---------------------------------------------------------------------------

function toggleMenu() {
  const dropdown = $("menu-dropdown");
  if (dropdown.classList.contains("open")) {
    closeMenu();
  } else {
    dropdown.classList.add("open");
    $("menu-overlay").classList.remove("hidden");
  }
}

function closeMenu() {
  $("menu-dropdown").classList.remove("open");
  $("menu-overlay").classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Dev Panel
// ---------------------------------------------------------------------------

let devPanelActiveId = null;

async function openDevPanel() {
  const panel = $("dev-panel");
  if (!panel) return;
  panel.classList.remove("hidden");
  await renderDevScenarios();
}

function closeDevPanel() {
  const panel = $("dev-panel");
  if (panel) panel.classList.add("hidden");
}

async function renderDevScenarios() {
  const container = $("dev-scenarios");
  if (!container) return;

  const config = await getConfig();
  devPanelActiveId = config?.enabled ? config.scenario : null;

  const scenarios = getScenarios();
  container.innerHTML = scenarios.map((s) => `
    <button class="dev-scenario${devPanelActiveId === s.id ? " active" : ""}" data-id="${s.id}">
      <div class="dev-scenario-radio"></div>
      <div class="dev-scenario-info">
        <div class="dev-scenario-name">${s.name}</div>
        <div class="dev-scenario-desc">${s.description}</div>
      </div>
    </button>
  `).join("");

  container.querySelectorAll(".dev-scenario").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const newId = devPanelActiveId === id ? null : id;
      devPanelActiveId = newId;
      if (newId) {
        await setConfig({ enabled: true, scenario: newId, latency: 0 });
      } else {
        await setConfig({ enabled: false, scenario: null, latency: 0 });
      }
      renderDevScenarios();
    });
  });
}

function initDevPanel() {
  $("dev-close")?.addEventListener("click", closeDevPanel);
  $("dev-clear")?.addEventListener("click", async () => {
    devPanelActiveId = null;
    await setConfig({ enabled: false, scenario: null, latency: 0 });
    renderDevScenarios();
  });
}

// ---------------------------------------------------------------------------
// Registro de eventos
// ---------------------------------------------------------------------------

let listenersBound = false;

function bindEventListeners() {
  if (listenersBound) return;
  listenersBound = true;
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

  // Menu dropdown
  $("btn-menu").addEventListener("click", toggleMenu);
  $("menu-overlay").addEventListener("click", closeMenu);

  $("menu-theme").addEventListener("click", async () => {
    closeMenu();
    currentTheme = toggleTheme(currentTheme);
    applyTheme(currentTheme);
    await saveTheme(currentTheme);
  });
  $("menu-refresh").addEventListener("click", () => { closeMenu(); handleRefresh(); });
  $("menu-export").addEventListener("click", () => { closeMenu(); handleExport(); });
  $("menu-import").addEventListener("click", () => { closeMenu(); handleImport(); });
  $("menu-report")?.addEventListener("click", () => closeMenu());
  $("menu-logout").addEventListener("click", () => { closeMenu(); handleLogout(); });

  // Dev panel
  if (IS_DEV_MODE) {
    const menuDev = $("menu-dev");
    if (menuDev) menuDev.style.display = "";
    if (menuDev) {
      menuDev.addEventListener("click", async () => {
        closeMenu();
        openDevPanel();
      });
    }
    initDevPanel();
  }

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

  // Toggle unfollowable banner
  $("btn-unfollowable-toggle").addEventListener("click", () => {
    state.showUnfollowable = !state.showUnfollowable;
    ui.updateStats(state);
    ui.renderList(state, makeListActions());
  });

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

  // Carrega whitelist e unfollowable antes de qualquer render
  state.whitelist = await loadWhitelist();
  await loadUnfollowable();

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
      ui.showMain();
      ui.showError(e.message, { onRetry: () => init() });
    }
  }
}

init();
