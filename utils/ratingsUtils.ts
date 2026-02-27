import type { Rating } from "../types";

/**
 * Get ratings that have been approved.
 * Used consistently across all dashboards for metrics and displays.
 */
export function getApprovedRatings(ratings: Rating[]): Rating[] {
  return ratings.filter((r) => r.isApproved);
}

/**
 * Get ratings pending approval.
 */
export function getPendingRatings(ratings: Rating[]): Rating[] {
  return ratings.filter((r) => !r.isApproved);
}

/**
 * Compute the average rating from approved ratings only.
 * Returns 0 if there are no approved ratings.
 * Formula: sum(scores) / count(approved)
 */
export function computeAverageRating(ratings: Rating[]): number {
  const approved = getApprovedRatings(ratings);
  if (approved.length === 0) return 0;
  const sum = approved.reduce((acc, r) => acc + r.score, 0);
  return sum / approved.length;
}

/**
 * Get approved ratings for a specific user (e.g., ratings received by a mentor).
 */
export function getApprovedRatingsForUser(
  ratings: Rating[],
  userId: string,
  direction: "from" | "to"
): Rating[] {
  const approved = getApprovedRatings(ratings);
  const key = direction === "from" ? "fromUserId" : "toUserId";
  return approved.filter((r) => r[key] === userId);
}

/**
 * Compute average from a pre-filtered list of ratings.
 * Use when you already have the subset (e.g., mentor's received ratings).
 * Returns 0 if the list is empty.
 */
export function computeAverageFromRatings(ratings: Rating[]): number {
  if (ratings.length === 0) return 0;
  return ratings.reduce((acc, r) => acc + r.score, 0) / ratings.length;
}
