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

/**
 * 核心推荐函数：
 * 1. 先尝试使用队友提供的 JSON（rec_Y*_U*.json）
 * 2. 如果这个 user 没有对应 JSON，则回退到原来的规则推荐
 */
export async function getNextSteps(
  userId: string,
  completedNodeId: string
): Promise<RecommendationItem[]> {
  // ⭐ 1) 先试试 JSON 文件
  const fileItems = getUserFileNextSteps(userId);

  // 调试用：你可以看一下控制台里打印的内容
  console.log(
    '[rec-system] getNextSteps userId=',
    userId,
    ' fileItems.length=',
    fileItems.length
  );

  if (fileItems.length > 0) {
    // 找到了对应 rec_Y*_U*.json，就直接用这个结果
    return fileItems;
  }

  // ⭐ 2) 如果没有 JSON，就按原来的规则推荐来
  if (mode === 'rule') {
    return getRuleNextSteps(userId, completedNodeId);
  }
  // TODO: LLM 分支可接入 API；目前复用规则结果
  return getRuleNextSteps(userId, completedNodeId);
}

// 给调试面板用：返回推荐结果 + 评估指标
export async function getNextStepsForDebug(
  userId: string,
  completedNodeId: string
): Promise<{ items: RecommendationItem[]; compare?: CompareResult }> {
  const items = await getNextSteps(userId, completedNodeId);
  if (!isDebugMode()) return { items };

  const compare = compareWithExpected(userId, completedNodeId, items);
  return { items, compare };
}

