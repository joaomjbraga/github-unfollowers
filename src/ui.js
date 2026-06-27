import { $ } from "./dom.js";

const VIRTUAL_THRESHOLD = 50;
const ITEM_HEIGHT = 52;
const OVERSCAN = 10;

let currentVirtual = null;

class VirtualScroll {
  constructor(container, list, actions, newSet) {
    this.container = container;
    this.list = list;
    this.actions = actions;
    this.newSet = newSet;
    this.pool = [];
    this.nodes = new Map();
    this.lastStart = -1;
    this.lastEnd = -1;

    container.innerHTML = "";
    container.style.position = "relative";

    this.viewport = document.createElement("div");
    this.viewport.style.position = "relative";
    this.viewport.style.height = `${list.length * ITEM_HEIGHT}px`;
    this.viewport.style.pointerEvents = "none"; // eventos passam para os filhos absolutamente posicionados
    container.appendChild(this.viewport);

    this.boundScroll = () => this.onScroll();
    container.addEventListener("scroll", this.boundScroll);
    this.onScroll();
  }

  update(list, actions, newSet) {
    this.list = list;
    this.actions = actions;
    this.newSet = newSet;

    for (const node of this.nodes.values()) {
      this.releaseNode(node);
    }
    this.nodes.clear();
    this.viewport.style.height = `${list.length * ITEM_HEIGHT}px`;
    this.lastStart = -1;
    this.lastEnd = -1;
    this.onScroll();
  }

  onScroll() {
    const { scrollTop, clientHeight } = this.container;
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const end = Math.min(
      this.list.length,
      Math.ceil((scrollTop + clientHeight) / ITEM_HEIGHT) + OVERSCAN,
    );

    if (start === this.lastStart && end === this.lastEnd) return;

    for (const [index, node] of this.nodes) {
      if (index < start || index >= end) {
        this.releaseNode(node);
        this.nodes.delete(index);
      }
    }

    for (let i = start; i < end; i++) {
      if (this.nodes.has(i)) continue;
      const user = this.list[i];
      if (!user) continue;
      const node = this.acquireNode();
      this.populate(node, user, i);
      node.style.top = `${i * ITEM_HEIGHT}px`;
      this.viewport.appendChild(node);
      this.nodes.set(i, node);
    }

    this.lastStart = start;
    this.lastEnd = end;
  }

  acquireNode() {
    return this.pool.pop() || document.createElement("div");
  }

  releaseNode(node) {
    node.innerHTML = "";
    node.removeAttribute("style");
    if (node.parentNode) node.parentNode.removeChild(node);
    this.pool.push(node);
  }

  populate(node, user, index) {
    const { isMutual, isNotFollowingBack, followUser, unfollowUser } =
      this.actions;
    const isNew = this.newSet.has(user.login);

    node.className = "user-item virtual";
    node.dataset.login = user.login;
    if (isNew) node.classList.add("is-new");
    node.innerHTML = `
      <img class="avatar" src="${escHtml(user.avatar_url)}&s=64" alt="@${escHtml(user.login)}" loading="lazy" />
      <div class="user-info">
        <a class="user-login" href="https://github.com/${escHtml(user.login)}" target="_blank">
          ${escHtml(user.login)}
        </a>
        <div class="user-meta">
          ${user.name ? `<span class="user-name">${escHtml(user.name)}</span>` : ""}
          ${user.followers != null ? `<span class="user-sep">·</span><span class="user-followers">${escHtml(String(user.followers))} seguidores</span>` : ""}
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

    const button = node.querySelector("button");
    if (button) {
      button.addEventListener("click", () => {
        if (isNotFollowingBack && followUser) {
          followUser(user.login);
        } else if (!isMutual && unfollowUser) {
          unfollowUser(user.login);
        }
      });
    }

    node.style.position = "absolute";
    node.style.left = "0";
    node.style.right = "0";
    node.style.height = `${ITEM_HEIGHT}px`;
  }

  destroy() {
    this.container.removeEventListener("scroll", this.boundScroll);
    for (const node of this.nodes.values()) {
      this.releaseNode(node);
    }
    this.nodes.clear();
    this.pool = [];
    this.viewport.remove();
    this.container.innerHTML = "";
    this.container.style.position = "";
    currentVirtual = null;
  }
}

function renderFullList(userList, list, actions, newSet, isMutual, isNotFollowingBack) {
  userList.innerHTML = "";
  userList.style.position = "";

  list.forEach((user, i) => {
    const item = document.createElement("div");
    item.className = "user-item";
    item.dataset.login = user.login;
    item.style.animationDelay = `${Math.min(i * 20, 200)}ms`;

    const isNew = newSet.has(user.login);

    if (isNew) item.classList.add("is-new");

    item.innerHTML = `
      <img class="avatar" src="${escHtml(user.avatar_url)}&s=64" alt="@${escHtml(user.login)}" loading="lazy" />
      <div class="user-info">
        <a class="user-login" href="https://github.com/${escHtml(user.login)}" target="_blank">
          ${escHtml(user.login)}
        </a>
        <div class="user-meta">
          ${user.name ? `<span class="user-name">${escHtml(user.name)}</span>` : ""}
          ${user.followers != null ? `<span class="user-sep">·</span><span class="user-followers">${escHtml(String(user.followers))} seguidores</span>` : ""}
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

export function updateStats(state) {
  $("count-all").textContent = state.unfollowers.length;
  $("count-mutual").textContent = state.mutuals.length;
  $("count-not-following-back").textContent = state.notFollowingBack.length;
}

export function getFilteredList({
  activeTab,
  query,
  sortBy,
  unfollowers,
  mutuals,
  notFollowingBack,
}) {
  let source =
    activeTab === "mutual"
      ? mutuals
      : activeTab === "not-following-back"
        ? notFollowingBack
        : unfollowers;

  if (query) {
    const lowerQuery = query.toLowerCase();
    source = source.filter(
      (user) =>
        user.login.toLowerCase().includes(lowerQuery) ||
        (user.name && user.name.toLowerCase().includes(lowerQuery)),
    );
  }

  if (sortBy && sortBy !== "default") {
    const sorted = [...source];
    if (sortBy === "followers_desc") {
      sorted.sort((a, b) => (b.followers || 0) - (a.followers || 0));
    } else if (sortBy === "followers_asc") {
      sorted.sort((a, b) => (a.followers || 0) - (b.followers || 0));
    } else if (sortBy === "alpha") {
      sorted.sort((a, b) => a.login.localeCompare(b.login));
    }
    return sorted;
  }

  return source;
}

export function renderList(state, actions = {}) {
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

  if (isMutual && state.mutuals.length === 0) {
    currentVirtual?.destroy();
    currentVirtual = null;
    $("all-following-back-msg").innerHTML =
      "<strong>Nenhum seguidor mútuo.</strong>";
    allFollowingBack.classList.remove("hidden");
    return;
  }
  if (!isMutual && !isNotFollowingBack && state.unfollowers.length === 0) {
    currentVirtual?.destroy();
    currentVirtual = null;
    $("all-following-back-msg").innerHTML =
      "<strong>Tudo certo!</strong> Todos que você segue te seguem de volta.";
    allFollowingBack.classList.remove("hidden");
    return;
  }
  if (isNotFollowingBack && state.notFollowingBack.length === 0) {
    currentVirtual?.destroy();
    currentVirtual = null;
    $("all-following-back-msg").innerHTML =
      "<strong>Todos que te seguem, você já segue de volta.</strong>";
    allFollowingBack.classList.remove("hidden");
    return;
  }

  if (list.length === 0) {
    currentVirtual?.destroy();
    currentVirtual = null;
    emptyFiltered.classList.remove("hidden");
    return;
  }

  let newSet;
  if (isMutual) {
    newSet = new Set((state.newMutuals || []).map((u) => u.login));
  } else if (isNotFollowingBack) {
    newSet = new Set((state.newNotFollowingBack || []).map((u) => u.login));
  } else {
    newSet = new Set((state.newUnfollowers || []).map((u) => u.login));
  }

  if (!state.sortBy || state.sortBy === "default") {
    list.sort((a, b) => +(newSet.has(b.login)) - +(newSet.has(a.login)));
  }

  const useVirtual = list.length > VIRTUAL_THRESHOLD;

  if (currentVirtual && !useVirtual) {
    currentVirtual.destroy();
    currentVirtual = null;
  }

  const actionsWithMeta = {
    ...actions,
    isMutual,
    isNotFollowingBack,
  };

  if (useVirtual) {
    if (!currentVirtual) {
      currentVirtual = new VirtualScroll(userList, list, actionsWithMeta, newSet);
    } else {
      currentVirtual.update(list, actionsWithMeta, newSet);
    }
  } else {
    renderFullList(userList, list, actionsWithMeta, newSet, isMutual, isNotFollowingBack);
  }
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
