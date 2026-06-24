import { state } from './store.js';
import { ghFetch } from './api.js';
import { $ } from './dom.js';

export function updateStats() {
  $('count-all').textContent = state.unfollowers.length;
  $('count-mutual').textContent = state.mutuals.length;
  $('count-not-following-back').textContent = state.notFollowingBack.length;
}

export function getFilteredList() {
  let source;
  if (state.activeTab === 'mutual') source = state.mutuals;
  else if (state.activeTab === 'not-following-back') source = state.notFollowingBack;
  else source = state.unfollowers;

  if (!state.query) return source;
  const q = state.query.toLowerCase();
  return source.filter(
    u => u.login.toLowerCase().includes(q) || (u.name && u.name.toLowerCase().includes(q))
  );
}

export function renderList() {
  const list = getFilteredList();
  const isMutual = state.activeTab === 'mutual';
  const isNotFollowingBack = state.activeTab === 'not-following-back';
  const userList = $('user-list');
  const btnUnfollowAll = $('btn-unfollow-all');
  const emptyFiltered = $('empty-filtered');
  const allFollowingBack = $('all-following-back');

  btnUnfollowAll.style.display = isNotFollowingBack || isMutual || state.unfollowers.length === 0 ? 'none' : '';
  allFollowingBack.classList.add('hidden');
  emptyFiltered.classList.add('hidden');
  userList.innerHTML = '';

  if (isMutual && state.mutuals.length === 0) {
    $('all-following-back-msg').innerHTML = '<strong>Nenhum seguidor mútuo.</strong>';
    allFollowingBack.classList.remove('hidden');
    return;
  }
  if (isNotFollowingBack && state.notFollowingBack.length === 0) {
    $('all-following-back-msg').innerHTML = '<strong>Todos que te seguem, você já segue de volta.</strong>';
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
        : isNotFollowingBack
          ? `<button class="btn btn-primary-sm" data-login="${user.login}">Seguir</button>`
          : `<button class="btn btn-danger-sm" data-login="${user.login}">Parar de seguir</button>`
      }
    `;

    if (isNotFollowingBack) {
      item.querySelector('button').addEventListener('click', () => followUser(user.login));
    } else if (!isMutual) {
      item.querySelector('button').addEventListener('click', () => unfollowUser(user.login));
    }

    userList.appendChild(item);
  });
}

export async function unfollowUser(login) {
  const item = $('user-list').querySelector(`[data-login="${login}"]`);
  const btn = item?.querySelector('button');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  try {
    await ghFetch(`/user/following/${login}`, 'DELETE');
    state.following = state.following.filter(u => u.login !== login);
    state.unfollowers = state.unfollowers.filter(u => u.login !== login);
    state.mutuals = state.mutuals.filter(u => u.login !== login);
    if (state.followers.some(u => u.login === login)) {
      const user = state.followers.find(u => u.login === login);
      state.notFollowingBack = [...state.notFollowingBack, user];
    }
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

export async function followUser(login) {
  const item = $('user-list').querySelector(`[data-login="${login}"]`);
  const btn = item?.querySelector('button');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  try {
    await ghFetch(`/user/following/${login}`, 'PUT');
    state.notFollowingBack = state.notFollowingBack.filter(u => u.login !== login);
    state.following = [...state.following, { login, avatar_url: `https://github.com/${login}.png`, name: null }];
    updateStats();
    if (item) {
      item.classList.add('unfollowed');
      setTimeout(() => { renderList(); }, 400);
    }
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Seguir'; }
    showError(`Erro ao seguir ${login}: ${e.message}`);
  }
}

export function showToken() {
  $('screen-token').classList.remove('hidden');
  $('screen-main').classList.add('hidden');
}

export function showMain() {
  $('screen-token').classList.add('hidden');
  $('screen-main').classList.remove('hidden');
}

export function showLoading(msg) {
  $('loading-state').classList.remove('hidden');
  $('error-state').classList.add('hidden');
  $('results-state').classList.add('hidden');
  $('loading-label').textContent = msg;
}

export function showError(msg) {
  $('loading-state').classList.add('hidden');
  $('error-state').classList.remove('hidden');
  $('main-error').textContent = msg;
}

export function showResults() {
  $('loading-state').classList.add('hidden');
  $('error-state').classList.add('hidden');
  $('results-state').classList.remove('hidden');
}

export function setProgress(pct) {
  $('progress-bar').style.width = `${pct}%`;
}

export function showConnectError(msg) {
  $('connect-error').textContent = msg;
  $('connect-error').classList.remove('hidden');
}

export function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
