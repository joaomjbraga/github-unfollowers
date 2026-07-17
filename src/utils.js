/**
 * Cria um Set de logins a partir de uma lista de usuários ou de strings.
 * @param {GHUser[] | string[]} list
 * @returns {Set<string>}
 */
function createLoginSet(list) {
  if (!Array.isArray(list) || list.length === 0) return new Set();
  return typeof list[0] === "string"
    ? new Set(/** @type {string[]} */ (list))
    : new Set(/** @type {GHUser[]} */ (list).map((u) => u.login));
}

/**
 * Calcula as três listas de relacionamento a partir de followers/following.
 * @param {{ followers: GHUser[], following: GHUser[] }}
 * @returns {{ unfollowers: GHUser[], notFollowingBack: GHUser[], mutuals: GHUser[] }}
 */
export function computeRelationshipLists({ followers, following }) {
  const followerLogins = createLoginSet(followers);
  const followingLogins = createLoginSet(following);

  return {
    unfollowers: following.filter((u) => !followerLogins.has(u.login)),
    mutuals: following.filter((u) => followerLogins.has(u.login)),
    notFollowingBack: followers.filter((u) => !followingLogins.has(u.login)),
  };
}

/**
 * Escapa caracteres especiais HTML para prevenir XSS.
 * @param {string} str
 * @returns {string}
 */
export function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Promise que resolve após `ms` milissegundos.
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const GITHUB_STATUS_URL = "https://www.githubstatus.com";

/**
 * Mapeia códigos HTTP para mensagens amigáveis em português.
 * Para erros 5xx, inclui link para a página de status do GitHub.
 * @param {number} status
 * @returns {{ html: string, isServer: boolean }}
 */
export function httpFriendlyMessage(status) {
  const statusLink = `<a href="${GITHUB_STATUS_URL}" target="_blank" rel="noopener" class="error-link">Acompanhe o status do GitHub</a>`;

  const messages = {
    400: { html: "Algo foi enviado de forma incorreta. Por favor, tente novamente.", isServer: false },
    401: { html: "Sua sessão expirou. Por favor, faça login novamente.", isServer: false },
    403: { html: "O GitHub bloqueou esta requisição. Você pode ter atingido o limite de uso ou não tem permissão para este recurso.", isServer: false },
    404: { html: "Não foi possível encontrar este recurso no GitHub.", isServer: false },
    422: { html: "O GitHub recusou esta operação. Verifique se o perfil é público ou se há alguma restrição.", isServer: false },
    429: { html: "Você fez muitas requisições em pouco tempo. Aguarde alguns minutos e tente novamente.", isServer: false },
    500: { html: `Algo deu errado nos servidores do GitHub. Isso é temporário — tente novamente em alguns instantes.<br>${statusLink}`, isServer: true },
    502: { html: `O GitHub está temporariamente fora do ar. Tente novamente em alguns instantes.<br>${statusLink}`, isServer: true },
    503: { html: `O GitHub está temporariamente indisponível, possivelmente em manutenção. Tente novamente em alguns minutos.<br>${statusLink}`, isServer: true },
    504: { html: `A conexão com o GitHub demorou demais e foi interrompida. Verifique sua internet e tente novamente.<br>${statusLink}`, isServer: true },
  };

  return messages[status] || { html: `Ocorreu um erro inesperado no GitHub (HTTP ${status}). Tente novamente.`, isServer: status >= 500 };
}
