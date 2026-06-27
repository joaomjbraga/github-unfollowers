export const state = {
  token: null,
  user: null,
  following: [],
  followers: [],
  unfollowers: [],
  notFollowingBack: [],
  mutuals: [],
  newUnfollowers: [],
  newNotFollowingBack: [],
  newMutuals: [],
  sortBy: "default",
  activeTab: "all",
  query: "",
  cancelMassAction: false,
  isProcessing: false,
};

export function resetState() {
  state.token = null;
  state.user = null;
  state.following = [];
  state.followers = [];
  state.unfollowers = [];
  state.notFollowingBack = [];
  state.mutuals = [];
  state.newUnfollowers = [];
  state.newNotFollowingBack = [];
  state.newMutuals = [];
  state.sortBy = "default";
  state.activeTab = "all";
  state.query = "";
  state.cancelMassAction = false;
  state.isProcessing = false;
}
