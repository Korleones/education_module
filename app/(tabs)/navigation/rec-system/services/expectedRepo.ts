// app/(tabs)/rec-system/services/expectedRepo.ts

import raw from '../../../../../assets/data/expected_recommendations.json';

export interface ExpectedItem {
  id: string;
  kind: string;
}

export interface ExpectedCase {
  userId: string;
  completedNodeId: string;
  expected: ExpectedItem[];
}

// Use JSON directly as an array
const cases = raw as ExpectedCase[];

/** Find the corresponding expected recommendation based on userId + completedNodeId. */
export function getExpectedFor(
  userId: string,
  completedNodeId: string
): ExpectedCase | undefined {
  return cases.find(
    (c) => c.userId === userId && c.completedNodeId === completedNodeId
  );
}
