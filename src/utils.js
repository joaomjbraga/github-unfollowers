import { t, tHtml } from "./i18n.js";

function createLoginSet(list) {
  if (!Array.isArray(list) || list.length === 0) return new Set();
  return typeof list[0] === "string"
    ? new Set(/** @type {string[]} */ (list))
    : new Set(/** @type {GHUser[]} */ (list).map((u) => u.login));
}

/**
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
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const GITHUB_STATUS_URL = "https://www.githubstatus.com";

/**
 * @param {number} status
 * @returns {{ html: string, isServer: boolean }}
 */
export function httpFriendlyMessage(status) {
  const statusLink = `<a href="${GITHUB_STATUS_URL}" target="_blank" rel="noopener" class="error-link">${escHtml(t("httpStatusLink"))}</a>`;

  const messages = {
    400: { html: t("http400"), isServer: false },
    401: { html: t("http401"), isServer: false },
    403: { html: t("http403"), isServer: false },
    404: { html: t("http404"), isServer: false },
    422: { html: t("http422"), isServer: false },
    429: { html: t("http429"), isServer: false },
    500: { html: tHtml("http500", { statusLink }), isServer: true },
    502: { html: tHtml("http502", { statusLink }), isServer: true },
    503: { html: tHtml("http503", { statusLink }), isServer: true },
    504: { html: tHtml("http504", { statusLink }), isServer: true },
  };

  return messages[status] || { html: t("httpUnknown", { status }), isServer: status >= 500 };
}
