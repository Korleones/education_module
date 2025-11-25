// app/(tabs)/navigation/rec-system/services/recommendationService.ts
import type { RecommendationItem } from '../types/models';
import { getRuleNextSteps } from './ruleRecommender';
import { isDebugMode } from '../state/debugMode';
import { compareWithExpected, type CompareResult } from './compareService';
import { getUserFileNextSteps } from '../repo/userRecsRepo';  // ⭐ 新增

let mode: 'rule' | 'llm' = 'rule';
export const setMode = (m: 'rule' | 'llm') => {
  mode = m;
};
export const getMode = () => mode;


export async function getNextSteps(
  userId: string,
  completedNodeId: string
): Promise<RecommendationItem[]> {

  const fileItems = getUserFileNextSteps(userId);

  console.log(
    '[rec-system] getNextSteps userId=',
    userId,
    ' fileItems.length=',
    fileItems.length
  );

  if (fileItems.length > 0) {

    return fileItems;
  }
  if (mode === 'rule') {
    return getRuleNextSteps(userId, completedNodeId);
  }

  return getRuleNextSteps(userId, completedNodeId);
}

export async function getNextStepsForDebug(
  userId: string,
  completedNodeId: string
): Promise<{ items: RecommendationItem[]; compare?: CompareResult }> {
  const items = await getNextSteps(userId, completedNodeId);
  if (!isDebugMode()) return { items };

  const compare = compareWithExpected(userId, completedNodeId, items);
  return { items, compare };
}

