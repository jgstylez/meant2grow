import { describe, expect, it } from "vitest";
import {
  getMenteesHubId,
  getMentorsCircleId,
  isMenteesHubId,
  isMentorsCircleId,
} from "./chatGroups";

describe("chatGroups", () => {
  const orgId = "org-abc-123";

  it("builds stable org-scoped group ids", () => {
    expect(getMentorsCircleId(orgId)).toBe(`g-mentors-${orgId}`);
    expect(getMenteesHubId(orgId)).toBe(`g-mentees-${orgId}`);
  });

  it("detects mentors circle by legacy global id or org-scoped id", () => {
    expect(isMentorsCircleId("g-mentors")).toBe(true);
    expect(isMentorsCircleId(`g-mentors-${orgId}`, orgId)).toBe(true);
    expect(isMentorsCircleId(`g-mentors-${orgId}`)).toBe(false);
  });

  it("detects mentees hub by legacy global id or org-scoped id", () => {
    expect(isMenteesHubId("g-mentees")).toBe(true);
    expect(isMenteesHubId(`g-mentees-${orgId}`, orgId)).toBe(true);
    expect(isMenteesHubId(`g-mentees-${orgId}`)).toBe(false);
  });
});
