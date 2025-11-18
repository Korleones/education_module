// app/tabs/rec-system/services/compareService.ts
import type { RecommendationItem } from '../types/models';
import { getExpectedFor } from './expectedRepo';

export type CompareHit = { id: string; kind: string };

export interface CompareResult {
  precision: number;
  recall: number;
  missing: CompareHit[];    // Expected but not actually there → FN
  unexpected: CompareHit[]; // It actually exists but is not expected to exist → FP
}

// Comparing the two sets of recommendation results
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

  const tp = expected.length - missing.length; // true positive
  const precision = actual.length > 0 ? tp / actual.length : 0;
  const recall = expected.length > 0 ? tp / expected.length : 0;

  return { precision, recall, missing, unexpected };
}

export function compareWithExpected(
  userId: string,
  completedNodeId: string,
  actual: RecommendationItem[],
): CompareResult | undefined {
  // The return value here is of type ExpectedCase; let's first get the original result.
  const raw = getExpectedFor(userId, completedNodeId) as any;
  if (!raw) return undefined;

// Try extracting the actual recommendation list from raw:
// 1. If it's an array, use it directly.
// 2. If it's an object, try using fields like raw.expected / raw.items.
  const expected: RecommendationItem[] =
    Array.isArray(raw)
      ? raw
      : (raw.expected ?? raw.items ?? []);

  if (!expected || expected.length === 0) return undefined;

  return compareRecommendations(actual, expected);
}

