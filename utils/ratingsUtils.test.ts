import { describe, expect, it } from "vitest";
import type { Rating } from "../types";
import {
  computeAverageFromRatings,
  computeAverageRating,
  getApprovedRatings,
  getApprovedRatingsForUser,
  getPendingRatings,
} from "./ratingsUtils";

function rating(partial: Partial<Rating> & Pick<Rating, "id" | "score">): Rating {
  return {
    organizationId: partial.organizationId ?? "org-1",
    fromUserId: partial.fromUserId ?? "from-1",
    toUserId: partial.toUserId ?? "to-1",
    comment: partial.comment ?? "",
    date: partial.date ?? "2026-01-01",
    id: partial.id,
    score: partial.score,
    isApproved: partial.isApproved ?? true,
    ...partial,
  };
}

describe("getApprovedRatings / getPendingRatings", () => {
  const ratings: Rating[] = [
    rating({ id: "1", score: 5, isApproved: true }),
    rating({ id: "2", score: 3, isApproved: false }),
  ];

  it("splits approved vs pending", () => {
    expect(getApprovedRatings(ratings)).toHaveLength(1);
    expect(getPendingRatings(ratings)).toHaveLength(1);
    expect(getApprovedRatings(ratings)[0].id).toBe("1");
  });
});

describe("computeAverageRating", () => {
  it("averages only approved scores", () => {
    const ratings: Rating[] = [
      rating({ id: "1", score: 4, isApproved: true }),
      rating({ id: "2", score: 2, isApproved: true }),
      rating({ id: "3", score: 10, isApproved: false }),
    ];
    expect(computeAverageRating(ratings)).toBe(3);
  });

  it("returns 0 when no approved ratings", () => {
    expect(computeAverageRating([rating({ id: "1", score: 5, isApproved: false })])).toBe(0);
  });
});

describe("getApprovedRatingsForUser", () => {
  const ratings: Rating[] = [
    rating({
      id: "1",
      score: 5,
      isApproved: true,
      toUserId: "mentor-a",
      fromUserId: "u1",
    }),
    rating({
      id: "2",
      score: 4,
      isApproved: true,
      toUserId: "other",
      fromUserId: "mentor-a",
    }),
  ];

  it("filters by toUserId when direction is to", () => {
    const forMentor = getApprovedRatingsForUser(ratings, "mentor-a", "to");
    expect(forMentor).toHaveLength(1);
    expect(forMentor[0].id).toBe("1");
  });

  it("filters by fromUserId when direction is from", () => {
    const fromMentor = getApprovedRatingsForUser(ratings, "mentor-a", "from");
    expect(fromMentor).toHaveLength(1);
    expect(fromMentor[0].id).toBe("2");
  });
});

describe("computeAverageFromRatings", () => {
  it("averages all scores in the list", () => {
    expect(
      computeAverageFromRatings([
        rating({ id: "1", score: 2, isApproved: true }),
        rating({ id: "2", score: 4, isApproved: false }),
      ]),
    ).toBe(3);
  });

  it("returns 0 for empty list", () => {
    expect(computeAverageFromRatings([])).toBe(0);
  });
});
