import type { RecommendationItem } from '../types/models';
import { getRuleNextSteps } from './ruleRecommender';
import { isDebugMode } from '../state/debugMode';
import { compareWithExpected, type CompareResult } from './compareService';

// 现在只保留 Rule 模式
export async function getNextSteps(
  userId: string,
  completedNodeId: string
): Promise<RecommendationItem[]> {
  return getRuleNextSteps(userId, completedNodeId);
}

// Debug 模式下带 compare 结果
export async function getNextStepsForDebug(
  userId: string,
  completedNodeId: string
): Promise<{ items: RecommendationItem[]; compare?: CompareResult }> {

  const items = await getNextSteps(userId, completedNodeId);

  if (!isDebugMode()) return { items };

  const compare = compareWithExpected(userId, completedNodeId, items);
  return { items, compare };
}

