import { state } from './store.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { $ } from './dom.js';

const tokenInput = $('token-input');
const btnConnect = $('btn-connect');
const searchInput = $('search-input');
const btnUnfollowAll = $('btn-unfollow-all');

btnConnect.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  if (!token) return ui.showConnectError('Cole seu Personal Access Token acima.');
  btnConnect.disabled = true;
  btnConnect.textContent = 'Verificando...';
  $('connect-error').classList.add('hidden');
  try {
    state.token = token;
    const user = await api.ghFetch('/user');
    await api.setStorage('gh_token', token);
    state.user = user;
    ui.showMain();
    await loadData();
  } catch (e) {
    state.token = null;
    ui.showConnectError(`Token inválido ou sem permissões: ${e.message}`);
  } finally {
    btnConnect.disabled = false;
    btnConnect.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1 5.25A2.25 2.25 0 0 1 3.25 3h9.5A2.25 2.25 0 0 1 15 5.25v5.5A2.25 2.25 0 0 1 12.75 13h-9.5A2.25 2.25 0 0 1 1 10.75ZM3.25 4.5a.75.75 0 0 0-.75.75v.128l5.5 3.589 5.5-3.59V5.25a.75.75 0 0 0-.75-.75Zm9.25 2.867-4.215 2.748a1.75 1.75 0 0 1-1.87-.001L2.5 7.367v3.383c0 .414.336.75.75.75h9.5a.75.75 0 0 0 .75-.75Z"/>
      </svg> Conectar`;
  }
});

async function loadData() {
  ui.showLoading('Obtendo seu perfil...');
  ui.setProgress(5);

  try {
    if (!state.user) {
      state.user = await api.ghFetch('/user');
    }
    const login = state.user.login;
    $('header-user').href = `https://github.com/${login}`;
    $('header-login').textContent = `@${login}`;
    $('header-avatar').src = state.user.avatar_url;

    ui.setProgress(15);
    ui.showLoading('Carregando lista de seguindo...');
    state.following = await api.fetchAllPages(`/users/${login}/following`);
    ui.setProgress(50);

    ui.showLoading('Carregando lista de seguidores...');
    state.followers = await api.fetchAllPages(`/users/${login}/followers`);
    ui.setProgress(90);

    ui.showLoading('Calculando...');
    const followerSet = new Set(state.followers.map(u => u.login));
    const followingSet = new Set(state.following.map(u => u.login));

    state.unfollowers = state.following.filter(u => !followerSet.has(u.login));
    state.mutuals = state.following.filter(u => followerSet.has(u.login));
    state.notFollowingBack = state.followers.filter(u => !followingSet.has(u.login));

    ui.setProgress(100);
    ui.updateStats();
    ui.renderList();
    ui.showResults();
  } catch (e) {
    ui.showError(e.message);
  }
}

btnUnfollowAll.addEventListener('click', async () => {
  const toUnfollow = [...state.unfollowers];
  if (toUnfollow.length === 0) return;
  if (!confirm(`Parar de seguir ${toUnfollow.length} usuário(s)?`)) return;

  btnUnfollowAll.disabled = true;
  btnUnfollowAll.textContent = 'Processando...';

  for (const user of toUnfollow) {
    await ui.unfollowUser(user.login).catch(() => {});
    await ui.sleep(300);
  }

  btnUnfollowAll.disabled = false;
  btnUnfollowAll.textContent = 'Parar de seguir todos';
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.activeTab = tab.dataset.tab;
    state.query = '';
    searchInput.value = '';
    $('list-label').textContent =
      state.activeTab === 'mutual'
        ? 'Seguidores mútuos'
        : state.activeTab === 'not-following-back'
          ? 'Quem segue você'
          : 'Não te seguem de volta';
    ui.renderList();
  });
});

searchInput.addEventListener('input', e => {
  state.query = e.target.value.trim();
  ui.renderList();
});

$('btn-refresh').addEventListener('click', async () => {
  state.user = null;
  await loadData();
});

$('btn-logout').addEventListener('click', async () => {
  await api.removeStorage('gh_token');
  state.token = null;
  state.user = null;
  state.following = [];
  state.followers = [];
  state.unfollowers = [];
  state.mutuals = [];
  state.activeTab = 'all';
  state.query = '';
  tokenInput.value = '';
  ui.showToken();
});

async function init() {
  const stored = await api.getStorage('gh_token');
  if (stored) {
    state.token = stored;
    ui.showMain();
    await loadData();
  } else {
    ui.showToken();
  }
}

init();
