import * as api from "./api.js";
import { $ } from "./dom.js";
import { resetState, state } from "./store.js";
import * as ui from "./ui.js";
import { computeRelationshipLists } from "./utils.js";

// Precisam ser EXATAMENTE as mesmas chaves usadas em src/background.js,
// senão popup e background comparam contra baselines diferentes e o badge
// do ícone nunca fica em sincronia com o que aparece na lista.
const SNAPSHOT_KEYS = {
  unfollowers: "snapshot_unfollowers",
  notFollowingBack: "snapshot_not_following_back",
  mutuals: "snapshot_mutuals",
  initialized: "snapshot_initialized",
};

// Chave usada para persistir o progresso de uma ação em massa em andamento.
// Guardamos só os logins pendentes (não os objetos completos do usuário) porque
// os dados completos já estão disponíveis em state.following/state.notFollowingBack
// depois que refreshUserData() roda — não há necessidade de duplicar payload.
const MASS_ACTION_KEY = "mass_action_progress";

function updateBadge(totalNew) {
  if (totalNew > 0) {
    chrome.action.setBadgeText({ text: String(totalNew) });
    chrome.action.setBadgeBackgroundColor({ color: "#da3633" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

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
      : `Você está prestes a deixar de seguir <strong>${count}</strong> usuário(s) que não te seguem de volta.`;
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
    state.following = await api.fetchFollowing(state.user.login);
    ui.setProgress(50);

    ui.showLoading("Carregando lista de seguidores...");
    state.followers = await api.fetchFollowers(state.user.login);
    ui.setProgress(90);

    ui.showLoading("Calculando...");
    const [prevU, prevN, prevM, initialized] = await Promise.all([
      api.getStorage(SNAPSHOT_KEYS.unfollowers),
      api.getStorage(SNAPSHOT_KEYS.notFollowingBack),
      api.getStorage(SNAPSHOT_KEYS.mutuals),
      api.getStorage(SNAPSHOT_KEYS.initialized),
    ]);

    Object.assign(
      state,
      computeRelationshipLists({
        followers: state.followers,
        following: state.following,
      }),
    );

    // Na primeira vez que a extensão roda (sem baseline ainda), não existe
    // "novidade" de verdade — é só a fotografia inicial. Marcar tudo como
    // novo aqui faria a tag "Novo" e o badge aparecerem para todo mundo.
    if (initialized) {
      state.newUnfollowers = state.unfollowers.filter(
        (u) => !(prevU || []).includes(u.login),
      );
      state.newNotFollowingBack = state.notFollowingBack.filter(
        (u) => !(prevN || []).includes(u.login),
      );
      state.newMutuals = state.mutuals.filter(
        (u) => !(prevM || []).includes(u.login),
      );
    } else {
      state.newUnfollowers = [];
      state.newNotFollowingBack = [];
      state.newMutuals = [];
    }

    await Promise.all([
      api.setStorage(SNAPSHOT_KEYS.unfollowers, state.unfollowers.map((u) => u.login)),
      api.setStorage(SNAPSHOT_KEYS.notFollowingBack, state.notFollowingBack.map((u) => u.login)),
      api.setStorage(SNAPSHOT_KEYS.mutuals, state.mutuals.map((u) => u.login)),
      api.setStorage(SNAPSHOT_KEYS.initialized, true),
    ]);

    updateBadge(
      state.newUnfollowers.length +
        state.newNotFollowingBack.length +
        state.newMutuals.length,
    );

    ui.setProgress(100);
    ui.updateStats(state);
    ui.renderList(state, { followUser, unfollowUser });
    ui.showResults();
    scheduleAutoRefresh();
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

// Persiste a fila pendente em chrome.storage.local pra sobreviver ao popup
// fechando no meio do processo. Salva só os logins que ainda faltam — a cada
// iteração reescrevemos a fila inteira, então reabrir o popup nunca perde a
// contagem por mais de um item já em voo no momento do fechamento.
function saveMassActionProgress({ actionType, totalCount, pendingLogins }) {
  return api.setStorage(MASS_ACTION_KEY, {
    actionType, // "follow" | "unfollow"
    totalCount, // tamanho original da fila, pra manter "(done/total)" coerente ao retomar
    pendingLogins,
  });
}

function clearMassActionProgress() {
  return api.removeStorage(MASS_ACTION_KEY);
}

async function runMassAction({ actionType, items, actionFn, button, otherButton, processingLabel, idleLabel, totalCountOverride }) {
  if (state.isProcessing) return; // já tem uma ação em massa rodando, ignora clique duplicado

  state.isProcessing = true;
  state.cancelMassAction = false;

  // Em uma retomada após reabrir o popup, "items" já é só a fila pendente,
  // mas a label de progresso precisa continuar contando a partir do total
  // original (ex: "(7/20)", não "(0/13)"), senão parece que a ação reiniciou.
  const totalCount = totalCountOverride ?? items.length;
  let done = totalCount - items.length;

  button.disabled = true;
  otherButton.disabled = true;
  btnCancelMass.classList.remove("hidden");
  btnCancelMass.disabled = false;
  btnCancelMass.textContent = "Cancelar";
  button.textContent = `${processingLabel} (${done}/${totalCount})`;

  let pending = [...items];

  // Grava o estado inicial já aqui, antes da primeira chamada de API: cobre
  // o caso raro de o popup fechar entre o clique e a primeira resposta.
  await saveMassActionProgress({
    actionType,
    totalCount,
    pendingLogins: pending.map((u) => u.login),
  }).catch(() => {});

  for (const user of items) {
    if (state.cancelMassAction) break;
    await actionFn(user.login).catch(() => {});
    done++;
    pending = pending.slice(1);
    button.textContent = `${processingLabel} (${done}/${totalCount})`;
    // Salva a cada iteração: se o popup fechar agora, no máximo o item que
    // já estava em voo precisa ser refeito (a chamada de API é idempotente
    // o bastante: follow/unfollow repetido não causa efeito colateral extra).
    await saveMassActionProgress({
      actionType,
      totalCount,
      pendingLogins: pending.map((u) => u.login),
    }).catch(() => {});
    const delay = Math.max(api.getRateLimitDelay(), 200);
    if (delay > 0) await ui.sleep(delay);
  }

  const wasCancelled = state.cancelMassAction && done < totalCount;

  state.isProcessing = false;
  state.cancelMassAction = false;
  otherButton.disabled = false;
  btnCancelMass.classList.add("hidden");

  // Terminou (ou foi cancelada explicitamente): não há mais nada a resumir.
  await clearMassActionProgress().catch(() => {});

  if (wasCancelled) {
    button.textContent = `Cancelado (${done}/${totalCount})`;
    await ui.sleep(1500);
  }

  button.disabled = false;
  button.textContent = idleLabel;
}

async function handleUnfollowAll() {
  const toUnfollow = [...state.unfollowers];
  if (toUnfollow.length === 0) return;

  const confirmed = await showModal({ count: toUnfollow.length, isFollow: false });
  if (!confirmed) return;

  await runMassAction({
    actionType: "unfollow",
    items: toUnfollow,
    actionFn: unfollowUser,
    button: btnUnfollowAll,
    otherButton: btnFollowAll,
    processingLabel: "Processando",
    idleLabel: "Parar de seguir todos",
  });
}

async function handleFollowAll() {
  const toFollow = [...state.notFollowingBack];
  if (toFollow.length === 0) return;

  const confirmed = await showModal({ count: toFollow.length, isFollow: true });
  if (!confirmed) return;

  await runMassAction({
    actionType: "follow",
    items: toFollow,
    actionFn: followUser,
    button: btnFollowAll,
    otherButton: btnUnfollowAll,
    processingLabel: "Processando",
    idleLabel: "Seguir todos",
  });
}

// Se o popup foi fechado no meio de uma ação em massa, retoma de onde parou.
// Precisa rodar DEPOIS de refreshUserData() preencher state.following/
// state.notFollowingBack, porque é ali que resolvemos os logins pendentes
// de volta pros objetos de usuário (avatar, nome etc.) que actionFn espera.
async function resumePendingMassAction() {
  const progress = await api.getStorage(MASS_ACTION_KEY);
  if (!progress || !progress.pendingLogins || progress.pendingLogins.length === 0) {
    return;
  }

  const { actionType, totalCount, pendingLogins } = progress;
  const isFollow = actionType === "follow";

  // A lista de origem (notFollowingBack para seguir, unfollowers para deixar
  // de seguir) já reflete o estado atual do GitHub, então usuários que já
  // saíram dessas listas por outro motivo (ex: já não se aplicam mais) são
  // simplesmente ignorados aqui — sem erro, sem travar a retomada.
  const sourceList = isFollow ? state.notFollowingBack : state.unfollowers;
  const pendingSet = new Set(pendingLogins);
  const items = sourceList.filter((u) => pendingSet.has(u.login));

  if (items.length === 0) {
    await clearMassActionProgress().catch(() => {});
    return;
  }

  const button = isFollow ? btnFollowAll : btnUnfollowAll;
  const otherButton = isFollow ? btnUnfollowAll : btnFollowAll;

  await runMassAction({
    actionType,
    items,
    actionFn: isFollow ? followUser : unfollowUser,
    button,
    otherButton,
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
  ui.renderList(state, { followUser, unfollowUser });
}

function handleSortChange(event) {
  state.sortBy = event.target.value;
  ui.renderList(state, { followUser, unfollowUser });
}

function handleSearchInput(event) {
  const value = event.target.value.trim();
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.query = value;
    ui.renderList(state, { followUser, unfollowUser });
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
  await clearMassActionProgress().catch(() => {});
  api.clearCache();
  clearAutoRefresh();
  resetState();
  updateBadge(0);
  btnCancelMass.classList.add("hidden");
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
  tokenInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConnect();
    }
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
  await api.initCache();
  const stored = await api.getStorage("gh_token");
  if (stored) {
    state.token = stored;
    try {
      state.user = await api.fetchUser();
      ui.showMain();
      await refreshUserData();
      // Não bloqueia a tela: se houver fila pendente, ela continua em segundo
      // plano enquanto o usuário já vê a lista atualizada.
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
  } else {
    ui.showToken();
  }
}

init();
