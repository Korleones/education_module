// app/tabs/rec-system/services/compareService.ts
import type { RecommendationItem } from '../types/models';
import { getExpectedFor } from './expectedRepo';

export type CompareHit = { id: string; kind: string };

export interface CompareResult {
  precision: number;
  recall: number;
  missing: CompareHit[];    // 期望有但实际没有 → FN
  unexpected: CompareHit[]; // 实际有但期望没有 → FP
}

// 比较两组推荐结果
export function compareRecommendations(
  actual: RecommendationItem[],
  expected: RecommendationItem[]
): CompareResult {
  const key = (x: RecommendationItem) => `${x.kind}:${x.id}`;

  const actualKeys = new Set(actual.map(key));
  const expectedKeys = new Set(expected.map(key));

  const missing: CompareHit[] = [];
  const unexpected: CompareHit[] = [];

  for (const e of expected) {
    if (!actualKeys.has(key(e))) {
      missing.push({ id: e.id, kind: e.kind });
    }
  }
  for (const a of actual) {
    if (!expectedKeys.has(key(a))) {
      unexpected.push({ id: a.id, kind: a.kind });
    }
  }

  const tp = expected.length - missing.length; // 真阳性
  const precision = actual.length > 0 ? tp / actual.length : 0;
  const recall = expected.length > 0 ? tp / expected.length : 0;

  return { precision, recall, missing, unexpected };
}

export function compareWithExpected(
  userId: string,
  completedNodeId: string,
  actual: RecommendationItem[],
): CompareResult | undefined {
  // 这里的返回值在类型上是 ExpectedCase，我们先拿到原始结果
  const raw = getExpectedFor(userId, completedNodeId) as any;
  if (!raw) return undefined;

  // 尝试从 raw 中提取真正的推荐列表：
  // 1. 如果本身就是数组，就直接用
  // 2. 如果是对象，就尝试用 raw.expected / raw.items 之类的字段
  const expected: RecommendationItem[] =
    Array.isArray(raw)
      ? raw
      : (raw.expected ?? raw.items ?? []);

  if (!expected || expected.length === 0) return undefined;

  return compareRecommendations(actual, expected);
}

