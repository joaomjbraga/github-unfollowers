// ── State ──────────────────────────────────────────────────
let state = {
  token: null,
  user: null,
  following: [],
  followers: [],
  unfollowers: [],
  mutuals: [],
  activeTab: 'all',
  query: '',
};

// ── DOM refs ────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const screenToken   = $('screen-token');
const screenMain    = $('screen-main');
const tokenInput    = $('token-input');
const btnConnect    = $('btn-connect');
const connectError  = $('connect-error');

const loadingState  = $('loading-state');
const loadingLabel  = $('loading-label');
const progressBar   = $('progress-bar');
const errorState    = $('error-state');
const mainError     = $('main-error');
const resultsState  = $('results-state');
const userList      = $('user-list');
const emptyFiltered = $('empty-filtered');
const allFollowingBack = $('all-following-back');
const btnUnfollowAll = $('btn-unfollow-all');
const searchInput   = $('search-input');

// ── GitHub API ─────────────────────────────────────────────
const GH = 'https://api.github.com';

async function ghFetch(path, method = 'GET') {
  const res = await fetch(`${GH}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${state.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return method === 'DELETE' || res.status === 204 ? null : res.json();
}

async function fetchAllPages(path) {
  const results = [];
  let page = 1;
  while (true) {
    const data = await ghFetch(`${path}?per_page=100&page=${page}`);
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return results;
}

// ── Init ───────────────────────────────────────────────────
async function init() {
  const stored = await getStorage('gh_token');
  if (stored) {
    state.token = stored;
    showMain();
    await loadData();
  } else {
    showToken();
  }
}

// ── Storage helpers ────────────────────────────────────────
function getStorage(key) {
  return new Promise(resolve =>
    chrome.storage.local.get([key], res => resolve(res[key] || null))
  );
}
function setStorage(key, val) {
  return new Promise(resolve => chrome.storage.local.set({ [key]: val }, resolve));
}
function removeStorage(key) {
  return new Promise(resolve => chrome.storage.local.remove([key], resolve));
}

// ── Connect ────────────────────────────────────────────────
btnConnect.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  if (!token) return showConnectError('Cole seu Personal Access Token acima.');
  btnConnect.disabled = true;
  btnConnect.textContent = 'Verificando...';
  connectError.classList.add('hidden');
  try {
    state.token = token;
    const user = await ghFetch('/user');
    await setStorage('gh_token', token);
    state.user = user;
    showMain();
    await loadData();
  } catch (e) {
    state.token = null;
    showConnectError(`Token inválido ou sem permissões: ${e.message}`);
  } finally {
    btnConnect.disabled = false;
    btnConnect.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1 5.25A2.25 2.25 0 0 1 3.25 3h9.5A2.25 2.25 0 0 1 15 5.25v5.5A2.25 2.25 0 0 1 12.75 13h-9.5A2.25 2.25 0 0 1 1 10.75ZM3.25 4.5a.75.75 0 0 0-.75.75v.128l5.5 3.589 5.5-3.59V5.25a.75.75 0 0 0-.75-.75Zm9.25 2.867-4.215 2.748a1.75 1.75 0 0 1-1.87-.001L2.5 7.367v3.383c0 .414.336.75.75.75h9.5a.75.75 0 0 0 .75-.75Z"/>
      </svg> Conectar`;
  }
});

// ── Load data ──────────────────────────────────────────────
async function loadData() {
  showLoading('Obtendo seu perfil...');
  setProgress(5);

  try {
    if (!state.user) {
      state.user = await ghFetch('/user');
    }
    const login = state.user.login;
    $('header-user').textContent = `@${login}`;
    $('footer-login').textContent = `@${login}`;
    $('footer-avatar').src = state.user.avatar_url;

    setProgress(15);
    showLoading('Carregando lista de seguindo...');
    state.following = await fetchAllPages(`/users/${login}/following`);
    setProgress(50);

    showLoading('Carregando lista de seguidores...');
    state.followers = await fetchAllPages(`/users/${login}/followers`);
    setProgress(90);

    showLoading('Calculando...');
    const followerSet = new Set(state.followers.map(u => u.login));

    state.unfollowers = state.following.filter(u => !followerSet.has(u.login));
    state.mutuals     = state.following.filter(u =>  followerSet.has(u.login));

    setProgress(100);
    updateStats();
    renderList();
    showResults();
  } catch (e) {
    showError(e.message);
  }
}

// ── Render ─────────────────────────────────────────────────
function getFilteredList() {
  const source = state.activeTab === 'mutual' ? state.mutuals : state.unfollowers;
  if (!state.query) return source;
  const q = state.query.toLowerCase();
  return source.filter(u =>
    u.login.toLowerCase().includes(q) ||
    (u.name && u.name.toLowerCase().includes(q))
  );
}

function renderList() {
  const list = getFilteredList();
  const isMutual = state.activeTab === 'mutual';

  btnUnfollowAll.style.display = isMutual ? 'none' : '';

  allFollowingBack.classList.add('hidden');
  emptyFiltered.classList.add('hidden');
  userList.innerHTML = '';

  if (!isMutual && state.unfollowers.length === 0) {
    allFollowingBack.classList.remove('hidden');
    return;
  }

  if (list.length === 0) {
    emptyFiltered.classList.remove('hidden');
    return;
  }

  list.forEach((user, i) => {
    const item = document.createElement('div');
    item.className = 'user-item';
    item.dataset.login = user.login;
    item.style.animationDelay = `${Math.min(i * 20, 200)}ms`;

    item.innerHTML = `
      <img class="avatar" src="${user.avatar_url}&s=64" alt="${user.login}" loading="lazy" />
      <div class="user-info">
        <a class="user-login" href="https://github.com/${user.login}" target="_blank">
          ${user.login}
        </a>
        ${user.name ? `<div class="user-name">${escHtml(user.name)}</div>` : ''}
      </div>
      ${isMutual
        ? `<span class="badge-mutual">Mútuo</span>`
        : `<button class="btn btn-danger-sm" data-login="${user.login}">Parar de seguir</button>`
      }
    `;

    if (!isMutual) {
      item.querySelector('button').addEventListener('click', () => unfollowUser(user.login));
    }

    userList.appendChild(item);
  });
}

function updateStats() {
  $('stat-following').textContent  = state.following.length;
  $('stat-followers').textContent  = state.followers.length;
  $('stat-unfollowers').textContent = state.unfollowers.length;

  $('count-all').textContent     = state.unfollowers.length;
  $('count-mutual').textContent  = state.mutuals.length;
}

// ── Unfollow ───────────────────────────────────────────────
async function unfollowUser(login) {
  const item = userList.querySelector(`[data-login="${login}"]`);
  const btn  = item?.querySelector('button');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  try {
    await ghFetch(`/user/following/${login}`, 'DELETE');
    state.following    = state.following.filter(u => u.login !== login);
    state.unfollowers  = state.unfollowers.filter(u => u.login !== login);
    state.mutuals      = state.mutuals.filter(u => u.login !== login);
    updateStats();
    if (item) {
      item.classList.add('unfollowed');
      setTimeout(() => { renderList(); }, 400);
    }
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Parar de seguir'; }
    showError(`Erro ao deixar de seguir ${login}: ${e.message}`);
  }
}

btnUnfollowAll.addEventListener('click', async () => {
  const toUnfollow = [...state.unfollowers];
  if (toUnfollow.length === 0) return;
  if (!confirm(`Parar de seguir ${toUnfollow.length} usuário(s)?`)) return;

  btnUnfollowAll.disabled = true;
  btnUnfollowAll.textContent = 'Processando...';

  for (const user of toUnfollow) {
    await unfollowUser(user.login).catch(() => {});
    await sleep(300); // rate limit safety
  }

  btnUnfollowAll.disabled = false;
  btnUnfollowAll.textContent = 'Parar de seguir todos';
});

// ── Tabs ───────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.activeTab = tab.dataset.tab;
    state.query = '';
    searchInput.value = '';
    $('list-label').textContent =
      state.activeTab === 'mutual'
        ? 'Seguem de volta (mútuos)'
        : 'Não te seguem de volta';
    renderList();
  });
});

// ── Search ─────────────────────────────────────────────────
searchInput.addEventListener('input', e => {
  state.query = e.target.value.trim();
  renderList();
});

// ── Refresh ────────────────────────────────────────────────
$('btn-refresh').addEventListener('click', async () => {
  state.user = null;
  await loadData();
});

// ── Logout ─────────────────────────────────────────────────
$('btn-logout').addEventListener('click', async () => {
  await removeStorage('gh_token');
  state = { token: null, user: null, following: [], followers: [], unfollowers: [], mutuals: [], activeTab: 'all', query: '' };
  tokenInput.value = '';
  showToken();
});

// ── UI helpers ─────────────────────────────────────────────
function showToken() {
  screenToken.classList.remove('hidden');
  screenMain.classList.add('hidden');
}
function showMain() {
  screenToken.classList.add('hidden');
  screenMain.classList.remove('hidden');
}
function showLoading(msg) {
  loadingState.classList.remove('hidden');
  errorState.classList.add('hidden');
  resultsState.classList.add('hidden');
  loadingLabel.textContent = msg;
}
function showError(msg) {
  loadingState.classList.add('hidden');
  errorState.classList.remove('hidden');
  mainError.textContent = msg;
}
function showResults() {
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  resultsState.classList.remove('hidden');
}
function setProgress(pct) {
  progressBar.style.width = `${pct}%`;
}
function showConnectError(msg) {
  connectError.textContent = msg;
  connectError.classList.remove('hidden');
}
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Boot ───────────────────────────────────────────────────
init();
