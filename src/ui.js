import { $ } from "./dom.js";

export function updateStats(state) {
  $("count-all").textContent = state.unfollowers.length;
  $("count-mutual").textContent = state.mutuals.length;
  $("count-not-following-back").textContent = state.notFollowingBack.length;
}

export function getFilteredList({
  activeTab,
  query,
  unfollowers,
  mutuals,
  notFollowingBack,
}) {
  const source =
    activeTab === "mutual"
      ? mutuals
      : activeTab === "not-following-back"
        ? notFollowingBack
        : unfollowers;

  if (!query) return source;
  const lowerQuery = query.toLowerCase();
  return source.filter(
    (user) =>
      user.login.toLowerCase().includes(lowerQuery) ||
      (user.name && user.name.toLowerCase().includes(lowerQuery)),
  );
}

export function renderList(state, actions = {}, newLogins = []) {
  const list = getFilteredList(state);
  const isMutual = state.activeTab === "mutual";
  const isNotFollowingBack = state.activeTab === "not-following-back";
  const userList = $("user-list");
  const btnUnfollowAll = $("btn-unfollow-all");
  const emptyFiltered = $("empty-filtered");
  const allFollowingBack = $("all-following-back");

  btnUnfollowAll.style.display =
    isNotFollowingBack || isMutual || state.unfollowers.length === 0
      ? "none"
      : "";
  $("btn-follow-all").classList.toggle(
    "hidden",
    !isNotFollowingBack || state.notFollowingBack.length === 0,
  );
  allFollowingBack.classList.add("hidden");
  emptyFiltered.classList.add("hidden");
  userList.innerHTML = "";

  if (isMutual && state.mutuals.length === 0) {
    $("all-following-back-msg").innerHTML =
      "<strong>Nenhum seguidor mútuo.</strong>";
    allFollowingBack.classList.remove("hidden");
    return;
  }
  if (!isMutual && !isNotFollowingBack && state.unfollowers.length === 0) {
    $("all-following-back-msg").innerHTML =
      "<strong>Tudo certo!</strong> Todos que você segue te seguem de volta.";
    allFollowingBack.classList.remove("hidden");
    return;
  }
  if (isNotFollowingBack && state.notFollowingBack.length === 0) {
    $("all-following-back-msg").innerHTML =
      "<strong>Todos que te seguem, você já segue de volta.</strong>";
    allFollowingBack.classList.remove("hidden");
    return;
  }

  if (list.length === 0) {
    emptyFiltered.classList.remove("hidden");
    return;
  }

  const newSet = new Set(newLogins);
  list.forEach((user, i) => {
    const item = document.createElement("div");
    item.className = "user-item";
    item.dataset.login = user.login;
    item.style.animationDelay = `${Math.min(i * 20, 200)}ms`;

    const isNew = !isMutual && !isNotFollowingBack && newSet.has(user.login);

    item.innerHTML = `
      <img class="avatar" src="${user.avatar_url}&s=64" alt="${escHtml(user.login)}" loading="lazy" />
      <div class="user-info">
        <a class="user-login" href="https://github.com/${escHtml(user.login)}" target="_blank">
          ${escHtml(user.login)}
        </a>
        <div class="user-meta">
          ${user.name ? `<span class="user-name">${escHtml(user.name)}</span>` : ""}
          ${isNew ? `<span class="badge-new">Novo</span>` : ""}
        </div>
      </div>
      ${
        isMutual
          ? `<span class="badge-mutual">Mútuo</span>`
          : isNotFollowingBack
            ? `<button class="btn btn-primary-sm" data-login="${escHtml(user.login)}">Seguir</button>`
            : `<button class="btn btn-danger-sm" data-login="${escHtml(user.login)}">Parar de seguir</button>`
      }
    `;

    const button = item.querySelector("button");
    if (button) {
      if (isNotFollowingBack && actions.followUser) {
        button.addEventListener("click", () => actions.followUser(user.login));
      } else if (!isMutual && actions.unfollowUser) {
        button.addEventListener("click", () =>
          actions.unfollowUser(user.login),
        );
      }
    }

    userList.appendChild(item);
  });
}

export function showToken() {
  $("screen-token").classList.remove("hidden");
  $("screen-main").classList.add("hidden");
}

export function showMain() {
  $("screen-token").classList.add("hidden");
  $("screen-main").classList.remove("hidden");
}

export function showLoading(msg) {
  $("loading-state").classList.remove("hidden");
  $("error-state").classList.add("hidden");
  $("results-state").classList.add("hidden");
  $("loading-label").textContent = msg;
}

export function showError(msg) {
  $("loading-state").classList.add("hidden");
  $("error-state").classList.remove("hidden");
  $("main-error").textContent = msg;
}

export function showResults() {
  $("loading-state").classList.add("hidden");
  $("error-state").classList.add("hidden");
  $("results-state").classList.remove("hidden");
}

export function setProgress(pct) {
  $("progress-bar").style.width = `${pct}%`;
}

export function showConnectError(msg) {
  $("connect-error").textContent = msg;
  $("connect-error").classList.remove("hidden");
}

export function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function removeUserItem(login) {
  const item = document.querySelector(`[data-login="${login}"]`);
  if (item) item.remove();
}

export function refreshEmptyState(state) {
  const userList = $("user-list");
  const emptyFiltered = $("empty-filtered");
  const allFollowingBack = $("all-following-back");

  allFollowingBack.classList.add("hidden");
  emptyFiltered.classList.add("hidden");

  if (userList.children.length > 0) return;

  const isMutual = state.activeTab === "mutual";
  const isNotFollowingBack = state.activeTab === "not-following-back";

  if (isMutual && state.mutuals.length === 0) {
    $("all-following-back-msg").innerHTML =
      "<strong>Nenhum seguidor mútuo.</strong>";
    allFollowingBack.classList.remove("hidden");
    return;
  }
  if (!isMutual && !isNotFollowingBack && state.unfollowers.length === 0) {
    $("all-following-back-msg").innerHTML =
      "<strong>Tudo certo!</strong> Todos que você segue te seguem de volta.";
    allFollowingBack.classList.remove("hidden");
    return;
  }
  if (isNotFollowingBack && state.notFollowingBack.length === 0) {
    $("all-following-back-msg").innerHTML =
      "<strong>Todos que te seguem, você já segue de volta.</strong>";
    allFollowingBack.classList.remove("hidden");
    refreshFollowAllBtn(state);
    return;
  }

  emptyFiltered.classList.remove("hidden");
}

export function refreshUnfollowAllBtn(state) {
  const btn = $("btn-unfollow-all");
  btn.style.display =
    state.activeTab !== "all" || state.unfollowers.length === 0 ? "none" : "";
}

export function refreshFollowAllBtn(state) {
  const btn = $("btn-follow-all");
  btn.classList.toggle(
    "hidden",
    state.activeTab !== "not-following-back" || state.notFollowingBack.length === 0,
  );
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
