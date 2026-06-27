// Chaves do chrome.storage.local
export const STORAGE_KEYS = {
  token: "gh_token",
  pageCache: "page_cache_v2",
  cachedLists: "cached_lists",
  massActionProgress: "mass_action_progress",

  snapshots: {
    unfollowers: "snapshot_unfollowers",
    notFollowingBack: "snapshot_not_following_back",
    mutuals: "snapshot_mutuals",
    initialized: "snapshot_initialized",
  },

  pending: {
    unfollowers: "pending_new_unfollowers",
    notFollowingBack: "pending_new_not_following_back",
    mutuals: "pending_new_mutuals",
  },
};

// Compatibilidade com código legado que usa as chaves diretamente
export const SNAPSHOT_KEYS = STORAGE_KEYS.snapshots;
export const PENDING_KEYS = STORAGE_KEYS.pending;
export const CACHED_LISTS_KEY = STORAGE_KEYS.cachedLists;

export const GITHUB_API = "https://api.github.com";
export const FETCH_TIMEOUT_MS = 30_000;
export const MAX_RETRIES = 3;
export const PAGE_SIZE = 100;

// Intervalo de auto-refresh quando o popup está aberto
export const AUTO_REFRESH_MS = 60_000;

// Intervalo do background service worker (em minutos, para chrome.alarms)
export const BG_ALARM_INTERVAL_MINUTES = 5;

// Limite de itens para ativar scroll virtual
export const VIRTUAL_SCROLL_THRESHOLD = 50;
export const ITEM_HEIGHT_PX = 52;
export const OVERSCAN_ITEMS = 10;
