/**
 * The community's counts on the admin overview, in the order admin_community_stats_v1
 * returns them (a database test compares the two).
 */
export const COMMUNITY_METRICS = [
  "members",
  "tastings",
  "coffees",
  "comments",
  "likes",
  "follows",
  "lists",
  "cafe_visits",
] as const;
export type CommunityMetric = (typeof COMMUNITY_METRICS)[number];
