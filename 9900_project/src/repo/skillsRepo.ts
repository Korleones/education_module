import Raw from '../../assets/data/skills_knowledge.json';
import type { SkillsKnowledgeModel, KnowledgeNode } from '../types/models';

// 说明：你的原始JSON里“装所有节点”的键名如果不是 disciplines，改下面这行映射
const model = Raw as unknown as SkillsKnowledgeModel;
const nodes: KnowledgeNode[] = (model as any).disciplines ?? []; // 如名称不同，改成真实键名

const byId = new Map<string, KnowledgeNode>(nodes.map(n => [n.id, n]));

export const SkillsRepo = {
  meta: model.meta,
  getNode(id: string) { return byId.get(id); },
  getAll() { return nodes; },

  getNextProgression(id: string): KnowledgeNode[] {
    const cur = byId.get(id);
    if (!cur?.progression_to) return [];
    const next = byId.get(cur.progression_to);
    return next ? [next] : [];
  },

  getSimilar(id: string): KnowledgeNode[] {
    const cur = byId.get(id);
    if (!cur?.similar_to?.length) return [];
    return cur.similar_to
      .map(i => byId.get(i))
      .filter(Boolean) as KnowledgeNode[];
  },

  getReinforcedBy(id: string): string[] {
    const cur = byId.get(id);
    return cur?.reinforced_by ?? [];
  }
};
