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

// 直接把 JSON 当成数组用
const cases = raw as ExpectedCase[];

/** 根据 userId + completedNodeId 找到对应的期望推荐 */
export function getExpectedFor(
  userId: string,
  completedNodeId: string
): ExpectedCase | undefined {
  return cases.find(
    (c) => c.userId === userId && c.completedNodeId === completedNodeId
  );
}
