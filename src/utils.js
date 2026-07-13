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
