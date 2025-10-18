import type { RecommendationItem } from '../types/models';
import { getRuleNextSteps } from './ruleRecommender';

let mode: 'rule' | 'llm' = 'rule';
export const setMode = (m: 'rule' | 'llm') => { mode = m; };
export const getMode = () => mode;

export async function getNextSteps(userId: string, completedNodeId: string): Promise<RecommendationItem[]> {
  if (mode === 'rule') return getRuleNextSteps(userId, completedNodeId);
  // 暂时复用规则结果，后续可接 LLM API
  return getRuleNextSteps(userId, completedNodeId);
}
