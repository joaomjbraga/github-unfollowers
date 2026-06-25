export function createLoginSet(list) {
  if (!Array.isArray(list)) return new Set();
  if (list.length === 0) return new Set();
  if (typeof list[0] === "string") return new Set(list);
  return new Set(list.map((user) => user.login));
}

export function computeRelationshipLists({ followers, following }) {
  const followerLogins = createLoginSet(followers);
  const followingLogins = createLoginSet(following);

  return {
    unfollowers: following.filter((user) => !followerLogins.has(user.login)),
    mutuals: following.filter((user) => followerLogins.has(user.login)),
    notFollowingBack: followers.filter(
      (user) => !followingLogins.has(user.login),
    ),
  };
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
