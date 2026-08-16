import * as api from "./api.js";
import { $ } from "./dom.js";
import { resetState, state } from "./store.js";
import { setStorageMulti, removeStorage, getStorage, setStorage } from "./storage.js";
import * as ui from "./ui.js";
import { computeRelationshipLists, sleep, escHtml } from "./utils.js";
import { STORAGE_KEYS, AUTO_REFRESH_MS, IS_DEV_MODE } from "./constants.js";
import { addEvent, loadHistory, clearHistory, HISTORY_STORAGE_KEY } from "./history.js";
import { loadWhitelist, addToWhitelist, removeFromWhitelist, WHITELIST_STORAGE_KEY } from "./whitelist.js";
import { initTheme, toggleTheme, applyTheme, saveTheme } from "./theme.js";
import { getConfig, setConfig, getScenarios } from "./dev.js";
import { t, tHtml, setLocale, getLocale, initI18n, applyI18nToDOM, getIntlLocale, SUPPORTED_LOCALES } from "./i18n.js";

const { snapshots: SNAP, pending: PEND, cachedLists: CACHED_LISTS_KEY, massActionProgress: MASS_ACTION_KEY, unfollowableLogins: UNFOLLOWABLE_KEY } = STORAGE_KEYS;

const tokenInput = $("token-input");
const btnConnect = $("btn-connect");
const btnCreateToken = $("btn-create-token");
const searchInput = $("search-input");
const btnUnfollowAll = $("btn-unfollow-all");
const btnFollowAll = $("btn-follow-all");
const btnCancelMass = $("btn-cancel-mass");
const modalOverlay = $("modal-overlay");
const modalConfirm = $("modal-confirm");
const modalCancel = $("modal-cancel");
const modalTitle = $("modal-title");
const modalText = $("modal-text");
const modalIcon = document.querySelector(".modal-icon");

state.whitelist = new Set();
/** @type {"dark"|"light"} */
let currentTheme = "dark";

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

async function persistState() {
  await setStorageMulti({
    [CACHED_LISTS_KEY]: {
      following: state.following, followers: state.followers,
      unfollowers: state.unfollowers, notFollowingBack: state.notFollowingBack,
      mutuals: state.mutuals, ts: Date.now(),
    },
  });
}

function setUserHeader(user) {
  const locale = getIntlLocale();
  $("header-user").href = `https://github.com/${user.login}`;
  $("header-login").textContent = user.login;
  $("header-avatar").src = user.avatar_url;
  $("header-followers").textContent = (user.followers ?? 0).toLocaleString(locale);
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
  $("list-label").textContent = t("listLabelUnfollowers");
  setTabSelected($("results-state").querySelector(".tabs"), $("tab-all"));
  showMainTab("results");
}

function showMainTab(tab) {
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

  $("whitelist-list").querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const login = btn.dataset.remove;
      removeFromWhitelist(login).then(() => {
        state.whitelist.delete(login);
        renderWhitelistTab();
        ui.renderList(state, makeListActions());
      }).catch(console.error);
    });
  });
}

function showConfirmModal({ title, message, confirmText, confirmClass = "btn-primary", iconColor }) {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalText.innerHTML = message;
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

function makeListActions() {
  return {
    followUser: handleFollowUser,
    unfollowUser,
    onOpenProfile: handleOpenProfile,
    whitelist: state.whitelist,
  };
}

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
  if (mode === "whitelist") {
    await handleWhitelistToggle(user.login);
    return;
  }

  ui.openProfilePanel(user, {
    whitelist: state.whitelist,
    onWhitelistToggle: handleWhitelistToggle,
  });

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

  $("profile-whitelist-btn").onclick = async () => {
    await handleWhitelistToggle(user.login);
    const updated = state.whitelist.has(user.login);
    const wlBtn = $("profile-whitelist-btn");
    wlBtn.classList.toggle("is-whitelisted", updated);
    wlBtn.innerHTML = updated
      ? `${ICON_BOOKMARK_FILL} <span>${escHtml(t("profileWhitelistRemove"))}</span>`
      : `${ICON_BOOKMARK} <span>${escHtml(t("profileWhitelistAdd"))}</span>`;
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

let refreshInProgress = false;

async function refreshUserData({ silent = false } = {}) {
  if (refreshInProgress) return;
  refreshInProgress = true;

  if (!silent) {
    ui.showLoading(t("loadingProfile"));
    ui.setProgress(5);
  }

  try {
    state.user = await api.fetchUser();
    setUserHeader(state.user);
    if (!silent) ui.setProgress(15);

    if (!silent) ui.showLoading(t("loadingFollowing"));
    state.following = await api.fetchFollowing(state.user.login);
    if (!silent) ui.setProgress(50);

    if (!silent) ui.showLoading(t("loadingFollowers"));
    state.followers = await api.fetchFollowers(state.user.login);
    if (!silent) ui.setProgress(90);

    if (!silent) ui.showLoading(t("loadingCalculating"));
    Object.assign(state, computeRelationshipLists({ followers: state.followers, following: state.following }));

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

      for (const u of state.unfollowers) {
        if (!prevUSet.has(u.login)) {
          await addEvent({ type: "unfollowed", login: u.login, avatar_url: u.avatar_url });
        }
      }
      for (const u of state.notFollowingBack) {
        if (!prevNSet.has(u.login)) {
          await addEvent({ type: "not_following_back", login: u.login, avatar_url: u.avatar_url });
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
    }
    scheduleAutoRefresh();
    ui.updateStats(state);
    ui.renderList(state, makeListActions());
    api.persistCache().catch(() => {});
  } catch (e) {
    if (e.isAuthError) {
      ui.showConnectError(t("connectErrorSession"));
      ui.showToken();
    } else if (!silent) {
      ui.showError(e.message, { onRetry: () => refreshUserData() });
    }
    throw e;
  } finally {
    refreshInProgress = false;
  }
}

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
    if (button) { button.disabled = false; button.textContent = t("actionUnfollow"); }
    if (e.httpStatus === 403 || e.httpStatus === 404) {
      ui.showError(t("errorUnfollowInaccessible", { login }));
    } else if (e.httpStatus === 429) {
      ui.showError(t("errorRateLimit"));
    } else if (e.httpStatus >= 500) {
      ui.showError(t("errorGitHubTemp"));
    } else {
      ui.showError(t("errorUnfollow", { login, message: e.message }));
    }
    return { succeeded: false, unfollowable: false };
  }
}

async function followUser(login, { skipSideEffects = false } = {}) {
  const item = $("user-list").querySelector(`[data-login="${login}"]`);
  const button = item?.querySelector("[data-action='follow']");
  if (button) { button.disabled = true; button.textContent = "..."; }

  try {
    await api.ghFetch(`/user/following/${login}`, "PUT");

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
        break;
      }
    }

    if (!skipSideEffects) ui.removeUserItem(login);
    return { succeeded: true, unfollowable: false };
  } catch (e) {
    if (button) { button.disabled = false; button.textContent = t("actionFollow"); }

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
    if (!state.isProcessing) {
      ui.showError(t("errorFollow", { login, message: e.message }));
    }
    return { succeeded: false, unfollowable: false };
  }
}

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
  let done = 0;
  const succeededLogins = new Set();
  const attemptedLogins = new Set();
  const unfollowableLogins = new Set();

  button.disabled = true;
  otherButton.disabled = true;
  btnCancelMass.classList.remove("hidden");
  btnCancelMass.disabled = false;
  btnCancelMass.textContent = t("btnCancel");
  button.textContent = `${processingLabel} (${done}/${totalCount})`;

  await saveMassActionProgress({ actionType, totalCount, pendingLogins: items.map((u) => u.login) }).catch(() => {});

  for (let i = 0; i < items.length; i++) {
    if (state.cancelMassAction) break;
    const user = items[i];
    attemptedLogins.add(user.login);
    const result = await actionFn(user.login, { skipSideEffects: true });
    if (state.cancelMassAction) break;
    if (result.succeeded) { done++; succeededLogins.add(user.login); }
    else if (result.unfollowable) { unfollowableLogins.add(user.login); }
    button.textContent = `${processingLabel} (${done}/${totalCount})`;
    await saveMassActionProgress({ actionType, totalCount, pendingLogins: items.slice(i + 1).map((u) => u.login) }).catch(() => {});
    if (state.cancelMassAction) break;
    await sleep(Math.max(api.getRateLimitDelay(), 200));
  }

  const wasCancelled = state.cancelMassAction && done < totalCount;
  state.isProcessing = false;
  state.cancelMassAction = false;
  otherButton.disabled = false;
  btnCancelMass.classList.add("hidden");
  await clearMassActionProgress().catch(() => {});

  if (wasCancelled) {
    button.textContent = t("cancelledLabel", { done, total: totalCount });
    await sleep(1500);
  }
  button.disabled = false;
  button.textContent = idleLabel;

  return { succeededLogins, attemptedLogins, unfollowableLogins, done, wasCancelled };
}

async function handleUnfollowAll() {
  const toUnfollow = state.unfollowers.filter((u) => !state.whitelist.has(u.login));
  if (toUnfollow.length === 0) return;

  state.isProcessing = true;
  const confirmed = await showConfirmModal({
    title: t("modalTitleUnfollow"),
    message: tHtml("modalTextUnfollow", { count: toUnfollow.length }),
    confirmText: t("modalConfirmUnfollow"),
    iconColor: "var(--danger-hover)",
  });
  if (!confirmed) {
    state.isProcessing = false;
    return;
  }
  state.isProcessing = false;
  await runMassAction({
    actionType: "unfollow", items: toUnfollow, actionFn: unfollowUser,
    button: btnUnfollowAll, otherButton: btnFollowAll,
    processingLabel: t("processingLabel"), idleLabel: t("btnUnfollowAll"),
  });
  ui.updateStats(state);
  ui.renderList(state, makeListActions());
  await persistState();
}

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
    title: t("modalTitleFollow"),
    message: tHtml("modalTextFollow", { count: followable.length }),
    confirmText: t("modalConfirmFollow"),
    iconColor: "var(--accent-emphasis)",
  });
  if (!userConfirmed) {
    state.isProcessing = false;
    return;
  }

  state.isProcessing = false;
  const { succeededLogins, attemptedLogins, unfollowableLogins } = await runMassAction({
    actionType: "follow", items: followable, actionFn: followUser,
    button: btnFollowAll, otherButton: btnUnfollowAll,
    processingLabel: t("processingLabel"), idleLabel: t("btnFollowAll"),
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
    title: isFollow ? t("modalTitleFollow") : t("modalTitleUnfollow"),
    message: isFollow
      ? tHtml("modalTextResumeFollow", { count: items.length })
      : tHtml("modalTextResumeUnfollow", { count: items.length }),
    confirmText: isFollow ? t("modalConfirmFollow") : t("modalConfirmUnfollow"),
    iconColor: isFollow ? "var(--accent-emphasis)" : "var(--danger-hover)",
  });
  if (!userConfirmed) {
    state.isProcessing = false;
    await clearMassActionProgress().catch(() => {});
    return;
  }

  state.isProcessing = false;
  const { succeededLogins, attemptedLogins, unfollowableLogins } = await runMassAction({
    actionType, items,
    actionFn: isFollow ? followUser : unfollowUser,
    button: isFollow ? btnFollowAll : btnUnfollowAll,
    otherButton: isFollow ? btnUnfollowAll : btnFollowAll,
    processingLabel: t("resumingLabel"),
    idleLabel: isFollow ? t("btnFollowAll") : t("btnUnfollowAll"),
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
  btnCancelMass.textContent = t("cancellingLabel");
}

const TAB_LABELS = {
  all: "listLabelUnfollowers",
  mutual: "listLabelMutual",
  "not-following-back": "listLabelNotFollowingBack",
};

function handleTabClick(event) {
  const tab = event.currentTarget;
  setTabSelected(tab.closest(".tabs"), tab);
  state.activeTab = tab.dataset.tab;
  state.query = "";
  searchInput.value = "";
  $("list-label").textContent = t(TAB_LABELS[state.activeTab] ?? "");
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
  await refreshUserData().catch(() => {});
}

async function handleLogout() {
  refreshInProgress = false;
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
  ui.showToast(t("exportSuccess"));
}

/** @type {Record<string, string>} */
const LANG_LABELS = {
  pt: "PT", en: "EN", zh: "中文", es: "ES", hi: "हिन्दी", ar: "العربية",
  fr: "FR", de: "DE", ja: "日本語", ru: "RU", ko: "한국어",
  it: "IT", tr: "TR", vi: "VI", pl: "PL", nl: "NL",
};

// ── Language Picker ──

const LANG_ENGLISH_NAMES = {
  pt: "Portuguese", en: "English", zh: "Chinese", es: "Spanish",
  hi: "Hindi", ar: "Arabic", fr: "French", de: "German",
  ja: "Japanese", ru: "Russian", ko: "Korean", it: "Italian",
  tr: "Turkish", vi: "Vietnamese", pl: "Polish", nl: "Dutch",
};

function openLanguagePicker() {
  $("lang-picker").classList.remove("hidden");
  $("lang-picker-list").innerHTML = "";
  renderLanguageList("");
  $("lang-picker-search").value = "";
  $("lang-picker-search").focus();
}

function closeLanguagePicker() {
  $("lang-picker").classList.add("hidden");
  $("menu-language-label").textContent = t("menuLanguage", { lang: LANG_LABELS[getLocale()] });
}

function renderLanguageList(query) {
  const container = $("lang-picker-list");
  const current = getLocale();
  const q = query.toLowerCase().trim();
  const filtered = SUPPORTED_LOCALES.filter((code) => {
    if (!q) return true;
    const native = LANG_LABELS[code].toLowerCase();
    const english = LANG_ENGLISH_NAMES[code].toLowerCase();
    return native.includes(q) || english.includes(q) || code.includes(q);
  });
  container.innerHTML = filtered
    .map(
      (code) => `
        <button class="lang-picker-item" data-lang="${code}">
          <span class="lang-picker-item-code">${code}</span>
          <span class="lang-picker-item-native">${LANG_LABELS[code]}</span>
          <span class="lang-picker-item-check${code === current ? " active" : ""}">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
            </svg>
          </span>
        </button>`,
    )
    .join("");
  container.querySelectorAll(".lang-picker-item").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.dataset.lang;
      await setLocale(code);
      applyI18nToDOM();
      if (state.user) {
        setUserHeader(state.user);
        ui.updateStats(state);
        ui.renderList(state, makeListActions());
        if (!$("whitelist-state").classList.contains("hidden")) renderWhitelistTab();
        if (!$("history-state").classList.contains("hidden")) renderHistoryTab();
        if (ui.isPanelOpen()) ui.closeProfilePanel();
      }
      closeLanguagePicker();
    });
  });
}

function bindKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
      if (e.key === "Escape") document.activeElement.blur();
      return;
    }

    if (e.key === "Escape") {
      closeMenu();
      if (!modalOverlay.classList.contains("hidden")) { modalCancel.click(); return; }
      if (!$("lang-picker").classList.contains("hidden")) { closeLanguagePicker(); return; }
      if (ui.isPanelOpen()) { ui.closeProfilePanel(); return; }
    }

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

function getConnectBtnHtml() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1 5.25A2.25 2.25 0 0 1 3.25 3h9.5A2.25 2.25 0 0 1 15 5.25v5.5A2.25 2.25 0 0 1 12.75 13h-9.5A2.25 2.25 0 0 1 1 10.75ZM3.25 4.5a.75.75 0 0 0-.75.75v.128l5.5 3.589 5.5-3.59V5.25a.75.75 0 0 0-.75-.75Zm9.25 2.867-4.215 2.748a1.75 1.75 0 0 1-1.87-.001L2.5 7.367v3.383c0 .414.336.75.75.75h9.5a.75.75 0 0 0 .75-.75Z"/>
  </svg> ${t("btnConnect")}`;
}

async function handleConnect() {
  const token = tokenInput.value.trim();
  if (!token) return ui.showConnectError(t("connectErrorNoToken"));

  btnConnect.disabled = true;
  btnConnect.textContent = t("connectChecking");
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
      ui.showConnectError(t("connectErrorExpired"));
      ui.showToken();
    } else {
      ui.showConnectError(e.message);
    }
  } finally {
    btnConnect.disabled = false;
    btnConnect.innerHTML = getConnectBtnHtml();
  }
}

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
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const newId = devPanelActiveId === id ? null : id;
      devPanelActiveId = newId;
      const config = newId
        ? { enabled: true, scenario: newId, latency: 0 }
        : { enabled: false, scenario: null, latency: 0 };
      setConfig(config).then(() => renderDevScenarios()).catch(console.error);
    });
  });
}

function initDevPanel() {
  $("dev-close")?.addEventListener("click", closeDevPanel);
  $("dev-clear")?.addEventListener("click", () => {
    devPanelActiveId = null;
    setConfig({ enabled: false, scenario: null, latency: 0 }).then(() => renderDevScenarios()).catch(console.error);
  });
}

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

  $("menu-theme").addEventListener("click", () => {
    closeMenu();
    currentTheme = toggleTheme(currentTheme);
    applyTheme(currentTheme);
    saveTheme(currentTheme).catch(console.error);
  });

  $("menu-language").addEventListener("click", () => {
    closeMenu();
    openLanguagePicker();
  });

  // Language picker
  $("lang-picker-close").addEventListener("click", closeLanguagePicker);
  $("lang-picker-search").addEventListener("input", (e) => {
    renderLanguageList(e.target.value);
  });

  $("menu-refresh").addEventListener("click", () => { closeMenu(); handleRefresh(); });
  $("menu-export").addEventListener("click", () => { closeMenu(); handleExport(); });
  $("menu-import").addEventListener("click", () => {
    closeMenu();
    if (chrome?.tabs?.create && chrome.runtime?.getURL) {
      chrome.tabs.create({ url: chrome.runtime.getURL("import.html") });
    }
  });
  $("menu-report")?.addEventListener("click", () => closeMenu());
  $("menu-logout").addEventListener("click", () => { closeMenu(); handleLogout(); });

  // Dev panel
  if (IS_DEV_MODE) {
    const menuDev = $("menu-dev");
    if (menuDev) menuDev.style.display = "";
    if (menuDev) {
      menuDev.addEventListener("click", () => {
        closeMenu();
        openDevPanel();
      });
    }
    initDevPanel();
  }

  $("nav-tab-results").addEventListener("click", () => showMainTab("results"));
  $("nav-tab-history").addEventListener("click", () => showMainTab("history"));
  $("nav-tab-whitelist").addEventListener("click", () => showMainTab("whitelist"));

  $("btn-clear-history").addEventListener("click", () => {
    clearHistory().then(() => renderHistoryTab()).catch(console.error);
  });

  $("profile-close").addEventListener("click", () => ui.closeProfilePanel());
  $("profile-overlay").addEventListener("click", () => ui.closeProfilePanel());

  $("btn-unfollowable-toggle").addEventListener("click", () => {
    state.showUnfollowable = !state.showUnfollowable;
    ui.updateStats(state);
    ui.renderList(state, makeListActions());
  });

  bindKeyboardShortcuts();
}

async function init() {
  await initI18n();
  applyI18nToDOM();

  chrome.action.setBadgeText({ text: "" });
  currentTheme = await initTheme();
  bindEventListeners();
  await api.initCache();

  // Atualiza o rótulo do menu de idioma
  $("menu-language-label").textContent = t("menuLanguage", { lang: LANG_LABELS[getLocale()] });

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
      ui.showConnectError(t("connectErrorTokenExpired"));
      ui.showToken();
    } else {
      ui.showMain();
      ui.showError(e.message, { onRetry: () => init() });
    }
  }
}

// Ícones inline — duplicados localmente para evitar dependência circular
const ICON_BOOKMARK = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.751.751 0 0 1 3 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.91l3.023-2.489a.75.75 0 0 1 .954 0L11.5 12.41V2.75a.25.25 0 0 0-.25-.25Z"/></svg>`;
const ICON_BOOKMARK_FILL = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.751.751 0 0 1 3 14.25Z"/></svg>`;

init();
