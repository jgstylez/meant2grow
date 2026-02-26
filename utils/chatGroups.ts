/**
 * Org-scoped IDs for Mentors Circle and Mentees Hub.
 * Each organization has its own group documents so mentors/mentees
 * in Org A cannot see messages from Org B.
 */
export const getMentorsCircleId = (organizationId: string) =>
  `g-mentors-${organizationId}`;

export const getMenteesHubId = (organizationId: string) =>
  `g-mentees-${organizationId}`;

export const isMentorsCircleId = (id: string, organizationId?: string) =>
  id === "g-mentors" || (!!organizationId && id === getMentorsCircleId(organizationId));

export const isMenteesHubId = (id: string, organizationId?: string) =>
  id === "g-mentees" || (!!organizationId && id === getMenteesHubId(organizationId));
