export type StrandAbbr = 'QP' | 'PC' | 'PAD' | 'EVAL' | 'COMM'; // Inquiry 技能缩写

export interface InquirySkillLevels {
  QP: number; PC: number; PAD: number; EVAL: number; COMM: number;
}

export interface KnowledgeNode {
  id: string;           // e.g., "BIO.Y3.AC9S3U01"
  year: number;         // 3..10
  discipline: string;   // 学科名
  code: string;         // "AC9S3U01"
  title: string;
  description?: string;
  levels: { level: 1 | 2 | 3; outcomes: string[] }[]; // 年内三级
  progression_to?: string;     // 下一学年节点ID
  similar_to?: string[];       // 相似节点
  reinforced_by?: string[];    // 强化哪些 Inquiry 技能，如 "INQ.Y3.PAD"
}

export interface SkillsKnowledgeModelMeta {
  years: number[];
  skill_level_mapping: Record<string, number>; // "Y3":1 ... "Y10":8
}

export interface SkillsKnowledgeModel {
  meta: SkillsKnowledgeModelMeta;
  disciplines: KnowledgeNode[]; // 这里用“disciplines”承接整个节点表（根据真实JSON键名）
}

// ── 学生进度 ──
export interface UserProgress {
  user_id: string;
  year: number; // 学生年级
  skills_levels: InquirySkillLevels;
  knowledge_progress: { node: string; level: 1 | 2 | 3 }[];
  career_interests: string[]; // e.g., ["career.050"]
}

// ── 职业模型 ──
export interface CareerRequiredNode {
  node: string;        // 对应知识节点ID
  min_level: 1 | 2 | 3;
  weight: number;      // 0..1
}

export interface Career {
  id: string;
  title: string;
  category: string;
  min_skill_levels: InquirySkillLevels;
  required_knowledge: CareerRequiredNode[];
  logic: 'AND';
  threshold: number; // sum(weighted) 的达标阈值
}

export interface CareersCatalogMeta {
  references: {
    skills_knowledge_model_file: string;
    skill_strands: Record<StrandAbbr, string>;
  }
}
export interface CareersCatalog {
  meta: CareersCatalogMeta;
  careers: Career[];
}

// ── 推荐 DTO ──
export type RecKind = 'knowledge' | 'skill_strand' | 'career_gap';

export interface RecommendationItem {
  id: string;
  kind: RecKind;
  title: string;
  reason: string;
  confidence: number; // 0..1
  payload?: any; // 证据/缺口详情
}
