/**
 * Estado global da aplicação.
 *
 * Exportamos o objeto mutável diretamente para evitar boilerplate desnecessário
 * em uma extensão pequena. O contrato é: só o módulo que "owna" a propriedade
 * a modifica; os demais apenas lêem.
 */
const INITIAL_STATE = {
  token: null,
  user: null,
  following: /** @type {GHUser[]} */ ([]),
  followers: /** @type {GHUser[]} */ ([]),
  unfollowers: /** @type {GHUser[]} */ ([]),
  notFollowingBack: /** @type {GHUser[]} */ ([]),
  mutuals: /** @type {GHUser[]} */ ([]),
  newUnfollowers: /** @type {GHUser[]} */ ([]),
  newNotFollowingBack: /** @type {GHUser[]} */ ([]),
  newMutuals: /** @type {GHUser[]} */ ([]),
  sortBy: "default",
  activeTab: /** @type {"all"|"mutual"|"not-following-back"} */ ("all"),
  query: "",
  cancelMassAction: false,
  isProcessing: false,
  unfollowable: new Set(),
  showUnfollowable: false,
};

export const state = { ...INITIAL_STATE };

/** Restaura o estado para os valores iniciais sem trocar a referência do objeto. */
export function resetState() {
  Object.assign(state, INITIAL_STATE);
}
