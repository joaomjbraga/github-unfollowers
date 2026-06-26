import * as api from "./api.js";
import { $ } from "./dom.js";
import { resetState, state } from "./store.js";
import * as ui from "./ui.js";
import { computeRelationshipLists } from "./utils.js";

const tokenInput = $("token-input");
const btnConnect = $("btn-connect");
const btnCreateToken = $("btn-create-token");
const searchInput = $("search-input");
const sortSelect = $("sort-select");
const btnUnfollowAll = $("btn-unfollow-all");
const btnFollowAll = $("btn-follow-all");
const modalOverlay = $("modal-overlay");
const modalCount = $("modal-count");
const modalConfirm = $("modal-confirm");
const modalCancel = $("modal-cancel");
const modalTitle = $("modal-title");
const modalText = $("modal-text");

const AUTO_REFRESH_INTERVAL = 60000;
let refreshTimer = null;
let searchTimeout = null;

function clearAutoRefresh() {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function scheduleAutoRefresh() {
  clearAutoRefresh();
  refreshTimer = window.setInterval(async () => {
    if (!state.token || !state.user) return;
    api.clearCache();
    await refreshUserData().catch(() => {});
  }, AUTO_REFRESH_INTERVAL);
}

function setUserHeader(user) {
  $("header-user").href = `https://github.com/${user.login}`;
  $("header-login").textContent = user.login;
  $("header-avatar").src = user.avatar_url;
  $("header-followers").textContent = user.followers.toLocaleString("pt-BR");
}

function resetViewState() {
  state.activeTab = "all";
  state.query = "";
  state.sortBy = "default";
  searchInput.value = "";
  sortSelect.value = "default";
  $("list-label").textContent = "Não te seguem de volta";
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.classList.remove("active"));
  $("tab-all").classList.add("active");
}

function showModal({ count, isFollow }) {
  return new Promise((resolve) => {
    modalCount.textContent = count;
    modalTitle.textContent = isFollow ? "Seguir de volta?" : "Deixar de seguir?";
    modalText.innerHTML = isFollow
      ? `Você está prestes a seguir <strong>${count}</strong> usuário(s) que te seguem.`
      : `Você está prestes a deixar de seguir <strong>${count}</strong> usuário(s) que não te seguem de volta. Esta ação não pode ser desfeita.`;
    modalConfirm.textContent = isFollow ? "Sim, seguir" : "Sim, deixar de seguir";
    modalOverlay.classList.remove("hidden");
    modalConfirm.disabled = false;
    modalCancel.disabled = false;

    const cleanup = () => {
      modalConfirm.removeEventListener("click", onConfirm);
      modalCancel.removeEventListener("click", onCancel);
      modalOverlay.classList.add("hidden");
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    modalConfirm.addEventListener("click", onConfirm);
    modalCancel.addEventListener("click", onCancel);
  });
}

async function handleConnect() {
  const token = tokenInput.value.trim();
  if (!token)
    return ui.showConnectError("Cole seu Personal Access Token acima.");

  btnConnect.disabled = true;
  btnConnect.textContent = "Verificando...";
  $("connect-error").classList.add("hidden");

  try {
    state.token = token;
    const user = await api.fetchUser();
    await api.setStorage("gh_token", token);
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
    btnConnect.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1 5.25A2.25 2.25 0 0 1 3.25 3h9.5A2.25 2.25 0 0 1 15 5.25v5.5A2.25 2.25 0 0 1 12.75 13h-9.5A2.25 2.25 0 0 1 1 10.75ZM3.25 4.5a.75.75 0 0 0-.75.75v.128l5.5 3.589 5.5-3.59V5.25a.75.75 0 0 0-.75-.75Zm9.25 2.867-4.215 2.748a1.75 1.75 0 0 1-1.87-.001L2.5 7.367v3.383c0 .414.336.75.75.75h9.5a.75.75 0 0 0 .75-.75Z"/>
      </svg> Conectar`;
  }
}

async function refreshUserData() {
  ui.showLoading("Obtendo seu perfil...");
  ui.setProgress(5);

  try {
    if (!state.user) {
      state.user = await api.fetchUser();
    }

    setUserHeader(state.user);
    ui.setProgress(15);

    ui.showLoading("Carregando lista de seguindo...");
    api.clearCache();
    state.following = await api.fetchFollowing(state.user.login);
    ui.setProgress(50);

    ui.showLoading("Carregando lista de seguidores...");
    state.followers = await api.fetchFollowers(state.user.login);
    ui.setProgress(90);

    ui.showLoading("Calculando...");
    const prevSnap = (await api.getStorage("unfollowers_snapshot")) || [];
    Object.assign(
      state,
      computeRelationshipLists({
        followers: state.followers,
        following: state.following,
      }),
    );

    state.newUnfollowers = state.unfollowers.filter(
      (u) => !prevSnap.includes(u.login),
    );
    await api.setStorage(
      "unfollowers_snapshot",
      state.unfollowers.map((u) => u.login),
    );

    ui.setProgress(100);
    ui.updateStats(state);
    ui.renderList(state, { followUser, unfollowUser }, state.newUnfollowers);
    ui.showResults();
    scheduleAutoRefresh();
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

async function handleUnfollowAll() {
  const toUnfollow = [...state.unfollowers];
  if (toUnfollow.length === 0) return;

  const confirmed = await showModal({ count: toUnfollow.length, isFollow: false });
  if (!confirmed) return;

  btnUnfollowAll.disabled = true;
  btnUnfollowAll.textContent = "Processando...";

  for (const user of toUnfollow) {
    await unfollowUser(user.login).catch(() => {});
    const delay = Math.max(api.getRateLimitDelay(), 200);
    if (delay > 0) {
      await ui.sleep(delay);
    }
  }

  btnUnfollowAll.disabled = false;
  btnUnfollowAll.textContent = "Parar de seguir todos";
}

async function handleFollowAll() {
  const toFollow = [...state.notFollowingBack];
  if (toFollow.length === 0) return;

  const confirmed = await showModal({ count: toFollow.length, isFollow: true });
  if (!confirmed) return;

  btnFollowAll.disabled = true;
  btnFollowAll.textContent = "Processando...";

  for (const user of toFollow) {
    await followUser(user.login).catch(() => {});
    const delay = Math.max(api.getRateLimitDelay(), 200);
    if (delay > 0) {
      await ui.sleep(delay);
    }
  }

  btnFollowAll.disabled = false;
  btnFollowAll.textContent = "Seguir todos";
}

function handleTabClick(event) {
  const tab = event.currentTarget;
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  state.activeTab = tab.dataset.tab;
  state.query = "";
  searchInput.value = "";
  $("list-label").textContent =
    state.activeTab === "mutual"
      ? "Seguidores mútuos"
      : state.activeTab === "not-following-back"
        ? "Quem segue você"
        : "Não te seguem de volta";
  ui.renderList(state, { followUser, unfollowUser }, state.newUnfollowers);
}

function handleSortChange(event) {
  state.sortBy = event.target.value;
  ui.renderList(state, { followUser, unfollowUser }, state.newUnfollowers);
}

function handleSearchInput(event) {
  const value = event.target.value.trim();
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.query = value;
    ui.renderList(state, { followUser, unfollowUser }, state.newUnfollowers);
  }, 200);
}

async function handleRefresh() {
  api.clearCache();
  state.user = null;
  resetViewState();
  await refreshUserData();
}

async function handleLogout() {
  await api.removeStorage("gh_token");
  api.clearCache();
  clearAutoRefresh();
  resetState();
  tokenInput.value = "";
  ui.showToken();
}
async function unfollowUser(login) {
  const item = $("user-list").querySelector(`[data-login="${login}"]`);
  const button = item?.querySelector("button");
  if (button) {
    button.disabled = true;
    button.textContent = "...";
  }

  try {
    await api.ghFetch(`/user/following/${login}`, "DELETE");
    state.following = state.following.filter((u) => u.login !== login);
    state.unfollowers = state.unfollowers.filter((u) => u.login !== login);
    state.mutuals = state.mutuals.filter((u) => u.login !== login);

    if (state.followers.some((u) => u.login === login)) {
      const user = state.followers.find((u) => u.login === login);
      if (user) {
        state.notFollowingBack = [...state.notFollowingBack, user];
      }
    }

    ui.removeUserItem(login);
    ui.updateStats(state);
    ui.refreshEmptyState(state);
    ui.refreshUnfollowAllBtn(state);
  } catch (e) {
    if (button) {
      button.disabled = false;
      button.textContent = "Parar de seguir";
    }
    ui.showError(`Erro ao deixar de seguir ${login}: ${e.message}`);
  }
}

async function followUser(login) {
  const item = $("user-list").querySelector(`[data-login="${login}"]`);
  const button = item?.querySelector("button");
  if (button) {
    button.disabled = true;
    button.textContent = "...";
  }

  try {
    await api.ghFetch(`/user/following/${login}`, "PUT");
    const followUserData = state.notFollowingBack.find(
      (u) => u.login === login,
    );
    state.notFollowingBack = state.notFollowingBack.filter(
      (u) => u.login !== login,
    );
    if (followUserData) {
      state.following = [...state.following, followUserData];
      state.mutuals = [...state.mutuals, followUserData];
    }

    ui.removeUserItem(login);
    ui.updateStats(state);
    ui.refreshEmptyState(state);
  } catch (e) {
    if (button) {
      button.disabled = false;
      button.textContent = "Seguir";
    }
    ui.showError(`Erro ao seguir ${login}: ${e.message}`);
  }
}
function bindEventListeners() {
  btnConnect.addEventListener("click", handleConnect);
  btnCreateToken.addEventListener("click", () => {
    window.open(
      "https://github.com/settings/tokens/new?description=GitHub+Unfollowers&scopes=read:user,user:follow",
      "_blank",
    );
  });
  btnUnfollowAll.addEventListener("click", handleUnfollowAll);
  btnFollowAll.addEventListener("click", handleFollowAll);
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.addEventListener("click", handleTabClick));
  searchInput.addEventListener("input", handleSearchInput);
  sortSelect.addEventListener("change", handleSortChange);
  $("btn-refresh").addEventListener("click", handleRefresh);
  $("btn-logout").addEventListener("click", handleLogout);
}

async function init() {
  bindEventListeners();
  const stored = await api.getStorage("gh_token");
  if (stored) {
    state.token = stored;
    try {
      state.user = await api.fetchUser();
      ui.showMain();
      await refreshUserData();
    } catch (e) {
      state.token = null;
      if (e.isAuthError) {
        ui.showConnectError("Token salvo expirou ou foi revogado. Gere um novo.");
        ui.showToken();
      } else {
        ui.showError(e.message);
      }
    }
  } else {
    ui.showToken();
  }
}

init();
