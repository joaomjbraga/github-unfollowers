export const state = {
  token: null,
  user: null,
  following: [],
  followers: [],
  unfollowers: [],
  notFollowingBack: [],
  mutuals: [],
  activeTab: "all",
  query: "",
};

export function resetState() {
  state.token = null;
  state.user = null;
  state.following = [];
  state.followers = [];
  state.unfollowers = [];
  state.notFollowingBack = [];
  state.mutuals = [];
  state.activeTab = "all";
  state.query = "";
}
