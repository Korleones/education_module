import Raw from '../../../../../assets/data/Skills and Knowledge years 3-10.json';
import type { SkillsKnowledgeModel, KnowledgeNode } from '../types/models';


// Note: If the key name for "Contain all nodes" in your original JSON is not "disciplines", change the mapping to the following line.
const model = Raw as unknown as SkillsKnowledgeModel;
const nodes: KnowledgeNode[] = (model as any).disciplines ?? []; // If the names are different, change them to the actual key names.

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
