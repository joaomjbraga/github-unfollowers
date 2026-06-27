import { $ } from "./dom.js";
import { escHtml, sleep } from "./utils.js";
import { VIRTUAL_SCROLL_THRESHOLD, ITEM_HEIGHT_PX, OVERSCAN_ITEMS } from "./constants.js";

export { sleep };

// ---------------------------------------------------------------------------
// Virtual Scroll
// ---------------------------------------------------------------------------

/** @type {VirtualScroll | null} */
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
    this.viewport.style.cssText = `position:relative;height:${list.length * ITEM_HEIGHT_PX}px`;
    container.appendChild(this.viewport);

    this.boundScroll = () => this.render();
    container.addEventListener("scroll", this.boundScroll, { passive: true });
    this.render();
  }

  update(list, actions, newSet) {
    this.list = list;
    this.actions = actions;
    this.newSet = newSet;
    this.releaseAll();
    this.viewport.style.height = `${list.length * ITEM_HEIGHT_PX}px`;
    this.lastStart = -1;
    this.lastEnd = -1;
    this.render();
  }

  render() {
    const { scrollTop, clientHeight } = this.container;
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT_PX) - OVERSCAN_ITEMS);
    const end = Math.min(
      this.list.length,
      Math.ceil((scrollTop + clientHeight) / ITEM_HEIGHT_PX) + OVERSCAN_ITEMS,
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
      this.populate(node, user);
      node.style.top = `${i * ITEM_HEIGHT_PX}px`;
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
    node.className = "";
    node.removeAttribute("style");
    node.parentNode?.removeChild(node);
    this.pool.push(node);
  }

  releaseAll() {
    for (const node of this.nodes.values()) this.releaseNode(node);
    this.nodes.clear();
  }

  populate(node, user) {
    const { isMutual, isNotFollowingBack, followUser, unfollowUser, onOpenProfile, whitelist } = this.actions;
    const isNew = this.newSet.has(user.login);
    const isWhitelisted = whitelist?.has(user.login);

    node.className = `user-item virtual${isNew ? " is-new" : ""}`;
    node.dataset.login = user.login;
    node.style.cssText = `position:absolute;left:0;right:0;height:${ITEM_HEIGHT_PX}px`;
    node.innerHTML = buildUserItemHtml(user, { isMutual, isNotFollowingBack, isNew, isWhitelisted });
    bindUserItemEvents(node, user, { isMutual, isNotFollowingBack, followUser, unfollowUser, onOpenProfile, whitelist });
  }

  destroy() {
    this.container.removeEventListener("scroll", this.boundScroll);
    this.releaseAll();
    this.pool = [];
    this.viewport.remove();
    this.container.innerHTML = "";
    this.container.style.position = "";
    currentVirtual = null;
  }
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function avatarSrc(url) {
  const sep = url.includes("?") ? "&" : "?";
  return `${escHtml(url)}${sep}s=64`;
}

function buildUserItemHtml(user, { isMutual, isNotFollowingBack, isNew, isWhitelisted }) {
  const actionHtml = isMutual
    ? `<div class="user-actions">
        <span class="badge-mutual">Mútuo</span>
        <button class="btn-icon btn-profile" title="Ver perfil" aria-label="Ver perfil de ${escHtml(user.login)}">
          ${ICON_CHEVRON}
        </button>
       </div>`
    : isNotFollowingBack
      ? `<div class="user-actions">
          <button class="btn btn-primary-sm" data-action="follow">Seguir</button>
          <button class="btn-icon btn-profile" title="Ver perfil" aria-label="Ver perfil de ${escHtml(user.login)}">
            ${ICON_CHEVRON}
          </button>
         </div>`
      : `<div class="user-actions">
          <button class="btn-icon btn-whitelist${isWhitelisted ? " is-whitelisted" : ""}" title="${isWhitelisted ? "Remover da whitelist" : "Ignorar sempre"}" aria-label="${isWhitelisted ? "Remover da whitelist" : "Ignorar sempre"}">
            ${isWhitelisted ? ICON_BOOKMARK_FILL : ICON_BOOKMARK}
          </button>
          <button class="btn btn-danger-sm" data-action="unfollow">Parar</button>
          <button class="btn-icon btn-profile" title="Ver perfil" aria-label="Ver perfil de ${escHtml(user.login)}">
            ${ICON_CHEVRON}
          </button>
         </div>`;

  return `
    <img class="avatar" src="${avatarSrc(user.avatar_url)}" alt="@${escHtml(user.login)}" loading="lazy" />
    <div class="user-info">
      <span class="user-login">${escHtml(user.login)}</span>
      <div class="user-meta">
        ${user.name ? `<span class="user-name">${escHtml(user.name)}</span>` : ""}
        ${user.followers != null
          ? `<span class="user-sep">·</span><span class="user-followers">${Number(user.followers).toLocaleString("pt-BR")} seg.</span>`
          : ""}
        ${isNew ? `<span class="badge-new">Novo</span>` : ""}
        ${isWhitelisted ? `<span class="badge-whitelist">Ignorado</span>` : ""}
      </div>
    </div>
    ${actionHtml}
  `;
}

function bindUserItemEvents(node, user, { isMutual, isNotFollowingBack, followUser, unfollowUser, onOpenProfile, whitelist }) {
  const actionBtn = node.querySelector("[data-action]");
  if (actionBtn) {
    actionBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (actionBtn.dataset.action === "follow") followUser?.(user.login);
      else if (actionBtn.dataset.action === "unfollow") unfollowUser?.(user.login);
    });
  }

  const whitelistBtn = node.querySelector(".btn-whitelist");
  if (whitelistBtn) {
    whitelistBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onOpenProfile?.({ login: user.login, avatar_url: user.avatar_url }, "whitelist");
    });
  }

  const profileBtn = node.querySelector(".btn-profile");
  if (profileBtn) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onOpenProfile?.(user);
    });
  }

  // Clique no avatar também abre o painel
  const avatar = node.querySelector(".avatar");
  if (avatar) {
    avatar.addEventListener("click", (e) => {
      e.stopPropagation();
      onOpenProfile?.(user);
    });
    avatar.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onOpenProfile?.(user);
      }
    });
    avatar.tabIndex = 0;
    avatar.setAttribute("role", "button");
    avatar.style.cursor = "pointer";
  }
}

function renderFullList(userList, list, actions, newSet) {
  const { isMutual, isNotFollowingBack } = actions;
  userList.innerHTML = "";
  userList.style.position = "";

  const fragment = document.createDocumentFragment();
  list.forEach((user, i) => {
    const isNew = newSet.has(user.login);
    const isWhitelisted = actions.whitelist?.has(user.login);
    const item = document.createElement("div");
    item.className = `user-item${isNew ? " is-new" : ""}`;
    item.dataset.login = user.login;
    item.style.animationDelay = `${Math.min(i * 20, 200)}ms`;
    item.innerHTML = buildUserItemHtml(user, { isMutual, isNotFollowingBack, isNew, isWhitelisted });
    bindUserItemEvents(item, user, actions);
    fragment.appendChild(item);
  });
  userList.appendChild(fragment);
}

// ---------------------------------------------------------------------------
// Painel de perfil lateral
// ---------------------------------------------------------------------------

let profilePanelOpen = false;
let profilePanelCloseCallback = null;

export function openProfilePanel(user, { onWhitelistToggle, whitelist } = {}) {
  const panel = $("profile-panel");
  const overlay = $("profile-overlay");
  const isWhitelisted = whitelist?.has(user.login);

  $("profile-avatar").src = `${user.avatar_url}?s=128`;
  $("profile-avatar").alt = `@${user.login}`;
  $("profile-login").textContent = `@${user.login}`;
  $("profile-login-link").href = `https://github.com/${user.login}`;
  $("profile-name").textContent = user.name || "";
  $("profile-name").classList.toggle("hidden", !user.name);
  $("profile-bio").textContent = user.bio || "";
  $("profile-bio").classList.toggle("hidden", !user.bio);
  $("profile-location").textContent = user.location || "";
  $("profile-location").parentElement?.classList.toggle("hidden", !user.location);
  $("profile-company").textContent = user.company || "";
  $("profile-company").parentElement?.classList.toggle("hidden", !user.company);
  $("profile-followers-count").textContent = (user.followers || 0).toLocaleString("pt-BR");
  $("profile-following-count").textContent = (user.following || 0).toLocaleString("pt-BR");
  $("profile-repos-count").textContent = (user.public_repos || 0).toLocaleString("pt-BR");

  // Estado de loading para repos
  $("profile-repos-list").innerHTML = `<div class="profile-loading">Carregando...</div>`;

  // Botão de whitelist
  const wlBtn = $("profile-whitelist-btn");
  wlBtn.classList.toggle("is-whitelisted", !!isWhitelisted);
  wlBtn.title = isWhitelisted ? "Remover da whitelist" : "Ignorar sempre (whitelist)";
  wlBtn.innerHTML = isWhitelisted
    ? `${ICON_BOOKMARK_FILL} <span>Remover da whitelist</span>`
    : `${ICON_BOOKMARK} <span>Ignorar sempre</span>`;

  profilePanelOpen = true;
  panel.classList.add("open");
  overlay.classList.remove("hidden");

  // Callback para fechar
  profilePanelCloseCallback = () => closeProfilePanel();

  return { isWhitelisted };
}

export function closeProfilePanel() {
  const panel = $("profile-panel");
  const overlay = $("profile-overlay");
  panel.classList.remove("open");
  overlay.classList.add("hidden");
  profilePanelOpen = false;
  profilePanelCloseCallback = null;
}

export function isPanelOpen() {
  return profilePanelOpen;
}

export function renderProfileRepos(repos) {
  const container = $("profile-repos-list");
  if (!repos || repos.length === 0) {
    container.innerHTML = `<p class="profile-empty">Nenhum repositório público.</p>`;
    return;
  }
  container.innerHTML = repos
    .slice(0, 5)
    .map(
      (r) => `
      <a class="profile-repo" href="${escHtml(r.html_url)}" target="_blank" rel="noopener">
        <span class="profile-repo-name">${escHtml(r.name)}</span>
        ${r.description ? `<span class="profile-repo-desc">${escHtml(r.description)}</span>` : ""}
        <div class="profile-repo-meta">
          ${r.language ? `<span class="profile-repo-lang">${escHtml(r.language)}</span>` : ""}
          ${r.stargazers_count > 0 ? `<span class="profile-repo-stars">${ICON_STAR} ${r.stargazers_count.toLocaleString("pt-BR")}</span>` : ""}
        </div>
      </a>`,
    )
    .join("");
}

// ---------------------------------------------------------------------------
// Aba de Histórico
// ---------------------------------------------------------------------------

export function renderHistory(events) {
  const container = $("history-list");
  if (!events || events.length === 0) {
    container.innerHTML = `
      <div class="state-center">
        ${ICON_HISTORY_EMPTY}
        <p>Nenhum evento registrado ainda.</p>
      </div>`;
    return;
  }

  const fmt = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  function relativeTime(ts) {
    const diff = ts - Date.now();
    const abs = Math.abs(diff);
    if (abs < 60_000) return "agora mesmo";
    if (abs < 3_600_000) return fmt.format(Math.round(diff / 60_000), "minute");
    if (abs < 86_400_000) return fmt.format(Math.round(diff / 3_600_000), "hour");
    return fmt.format(Math.round(diff / 86_400_000), "day");
  }

  container.innerHTML = events
    .map(
      (e) => `
      <div class="history-item">
        <img class="avatar" src="${avatarSrc(e.avatar_url)}" alt="@${escHtml(e.login)}" loading="lazy" />
        <div class="user-info">
          <a class="user-login" href="https://github.com/${escHtml(e.login)}" target="_blank" rel="noopener">
            ${escHtml(e.login)}
          </a>
          <div class="user-meta">
            <span class="history-badge history-badge--${e.type}">
              ${e.type === "unfollowed" ? "Deixou de seguir" : "Seguiu você"}
            </span>
            <span class="user-sep">·</span>
            <span class="user-followers">${relativeTime(e.ts)}</span>
          </div>
        </div>
      </div>`,
    )
    .join("");
}

// ---------------------------------------------------------------------------
// Whitelist management screen
// ---------------------------------------------------------------------------

export function renderWhitelistManager(whitelist, allUsers) {
  const container = $("whitelist-list");
  const entries = [...whitelist].map((login) => {
    const user = allUsers.find((u) => u.login === login);
    return { login, avatar_url: user?.avatar_url ?? `https://github.com/${login}.png` };
  });

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="state-center">
        ${ICON_BOOKMARK_EMPTY}
        <p>Nenhum usuário na whitelist.</p>
      </div>`;
    return;
  }

  container.innerHTML = entries
    .map(
      (e) => `
      <div class="user-item" data-login="${escHtml(e.login)}">
        <img class="avatar" src="${avatarSrc(e.avatar_url)}" alt="@${escHtml(e.login)}" loading="lazy" />
        <div class="user-info">
          <a class="user-login" href="https://github.com/${escHtml(e.login)}" target="_blank" rel="noopener">
            ${escHtml(e.login)}
          </a>
          <div class="user-meta">
            <span class="badge-whitelist">Ignorado</span>
          </div>
        </div>
        <button class="btn btn-danger-sm" data-remove="${escHtml(e.login)}">Remover</button>
      </div>`,
    )
    .join("");
}

// ---------------------------------------------------------------------------
// Estado vazio
// ---------------------------------------------------------------------------

const EMPTY_MESSAGES = {
  mutual: "<strong>Nenhum seguidor mútuo.</strong>",
  "not-following-back": "<strong>Todos que te seguem, você já segue de volta.</strong>",
  all: "<strong>Tudo certo!</strong> Todos que você segue te seguem de volta.",
};

function showEmptyForTab(activeTab) {
  const msg = EMPTY_MESSAGES[activeTab];
  if (!msg) return;
  $("all-following-back-msg").innerHTML = msg;
  $("all-following-back").classList.remove("hidden");
}

// ---------------------------------------------------------------------------
// API pública — stats e render principal
// ---------------------------------------------------------------------------

export function updateStats(state) {
  $("count-all").textContent = state.unfollowers.length;
  $("count-mutual").textContent = state.mutuals.length;
  $("count-not-following-back").textContent = state.notFollowingBack.length;
}

export function getFilteredList({ activeTab, query, sortBy, unfollowers, mutuals, notFollowingBack, whitelist }) {
  let source = activeTab === "mutual"
    ? mutuals
    : activeTab === "not-following-back"
      ? notFollowingBack
      : unfollowers;

  // Oculta whitelisted na aba de não-seguidores
  if (activeTab === "all" && whitelist?.size) {
    source = source.filter((u) => !whitelist.has(u.login));
  }

  if (query) {
    const q = query.toLowerCase();
    source = source.filter((u) => u.login.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q));
  }

  if (sortBy && sortBy !== "default") {
    const sorted = [...source];
    if (sortBy === "followers_desc") sorted.sort((a, b) => (b.followers || 0) - (a.followers || 0));
    else if (sortBy === "followers_asc") sorted.sort((a, b) => (a.followers || 0) - (b.followers || 0));
    else if (sortBy === "alpha") sorted.sort((a, b) => a.login.localeCompare(b.login));
    return sorted;
  }
  return source;
}

export function renderList(state, actions = {}) {
  const userList = $("user-list");
  const isMutual = state.activeTab === "mutual";
  const isNotFollowingBack = state.activeTab === "not-following-back";

  $("btn-unfollow-all").style.display =
    isMutual || isNotFollowingBack || state.unfollowers.length === 0 ? "none" : "";
  $("btn-follow-all").classList.toggle(
    "hidden",
    !isNotFollowingBack || state.notFollowingBack.length === 0,
  );

  $("all-following-back").classList.add("hidden");
  $("empty-filtered").classList.add("hidden");

  const sourceEmpty =
    (isMutual && state.mutuals.length === 0) ||
    (isNotFollowingBack && state.notFollowingBack.length === 0) ||
    (!isMutual && !isNotFollowingBack && state.unfollowers.filter(u => !state.whitelist?.has(u.login)).length === 0);

  if (sourceEmpty) {
    currentVirtual?.destroy();
    currentVirtual = null;
    showEmptyForTab(state.activeTab);
    return;
  }

  const list = getFilteredList(state);

  if (list.length === 0) {
    currentVirtual?.destroy();
    currentVirtual = null;
    $("empty-filtered").classList.remove("hidden");
    return;
  }

  const newArray = isMutual ? state.newMutuals : isNotFollowingBack ? state.newNotFollowingBack : state.newUnfollowers;
  const newSet = new Set((newArray || []).map((u) => u.login));

  if (!state.sortBy || state.sortBy === "default") {
    list.sort((a, b) => +newSet.has(b.login) - +newSet.has(a.login));
  }

  const actionsWithMeta = { ...actions, isMutual, isNotFollowingBack };
  const useVirtual = list.length > VIRTUAL_SCROLL_THRESHOLD;

  if (!useVirtual) {
    currentVirtual?.destroy();
    currentVirtual = null;
    renderFullList(userList, list, actionsWithMeta, newSet);
    return;
  }

  if (currentVirtual) {
    currentVirtual.update(list, actionsWithMeta, newSet);
  } else {
    currentVirtual = new VirtualScroll(userList, list, actionsWithMeta, newSet);
  }
}

// ---------------------------------------------------------------------------
// Estados de tela
// ---------------------------------------------------------------------------

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
  const bar = $("progress-bar");
  bar.style.width = `${pct}%`;
  bar.setAttribute("aria-valuenow", pct);
}

export function showConnectError(msg) {
  const el = $("connect-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}

export function removeUserItem(login) {
  document.querySelector(`[data-login="${login}"]`)?.remove();
}

export function refreshEmptyState(state) {
  const { activeTab, unfollowers, notFollowingBack, mutuals } = state;
  $("empty-filtered").classList.add("hidden");
  $("all-following-back").classList.add("hidden");

  const isEmpty =
    (activeTab === "mutual" && mutuals.length === 0) ||
    (activeTab === "not-following-back" && notFollowingBack.length === 0) ||
    (activeTab === "all" && unfollowers.filter(u => !state.whitelist?.has(u.login)).length === 0);

  if (isEmpty) showEmptyForTab(activeTab);
}

export function refreshUnfollowAllBtn(state) {
  $("btn-unfollow-all").style.display =
    state.activeTab !== "all" || state.unfollowers.length === 0 ? "none" : "";
}

// ---------------------------------------------------------------------------
// Ícones SVG inline
// ---------------------------------------------------------------------------

const ICON_CHEVRON = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"/></svg>`;

const ICON_BOOKMARK = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.751.751 0 0 1 3 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.91l3.023-2.489a.75.75 0 0 1 .954 0L11.5 12.41V2.75a.25.25 0 0 0-.25-.25Z"/></svg>`;

const ICON_BOOKMARK_FILL = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.751.751 0 0 1 3 14.25Z"/></svg>`;

const ICON_STAR = `<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>`;

const ICON_HISTORY_EMPTY = `<svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" style="color:var(--text-tertiary)"><path d="M1.643 3.143 1.43 1.35A.75.75 0 0 0 .25 1.46l.5 5a.75.75 0 0 0 .75.64h5a.75.75 0 0 0 0-1.5H2.324l.51-5.214A.75.75 0 0 0 1.643 3.143Zm.679 8.714a.75.75 0 0 0-.75.75v2.75a.75.75 0 0 0 1.5 0v-2.75a.75.75 0 0 0-.75-.75ZM8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM2.5 8a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Zm6.75-2.5a.75.75 0 0 0-1.5 0v2.75l1.5 1.5a.75.75 0 0 0 1.06-1.06L8.75 7.19V5.5Z"/></svg>`;

const ICON_BOOKMARK_EMPTY = `<svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" style="color:var(--text-tertiary)"><path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.751.751 0 0 1 3 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.91l3.023-2.489a.75.75 0 0 1 .954 0L11.5 12.41V2.75a.25.25 0 0 0-.25-.25Z"/></svg>`;
