export type StrandAbbr = 'QP' | 'PC' | 'PAD' | 'EVAL' | 'COMM'; // Inquiry (skill abbreviation)

export interface InquirySkillLevels {
  QP: number; PC: number; PAD: number; EVAL: number; COMM: number;
}

export interface KnowledgeNode {
  id: string;           // e.g., "BIO.Y3.AC9S3U01"
  year: number;         // 3..10
  discipline: string;   // Subject name
  code: string;         // "AC9S3U01"
  title: string;
  description?: string;
  levels: { level: 1 | 2 | 3; outcomes: string[] }[]; // Level 3 during the year
  progression_to?: string;     // Next academic year node ID
  similar_to?: string[];       // Similar nodes
  reinforced_by?: string[];    // Which Inquiry skills, such as "INQ.Y3.PAD", should be strengthened?
}

export interface SkillsKnowledgeModelMeta {
  years: number[];
  skill_level_mapping: Record<string, number>; // "Y3":1 ... "Y10":8
}

export interface SkillsKnowledgeModel {
  meta: SkillsKnowledgeModelMeta;
  disciplines: KnowledgeNode[]; // Here, "disciplines" is used to encompass the entire node table (based on the actual JSON key names).
}

// ── student progress ──
export interface UserProgress {
  user_id: string;
  year: number; // Student grade
  skills_levels: InquirySkillLevels;
  knowledge_progress: { node: string; level: 1 | 2 | 3 }[];
  career_interests: string[]; // e.g., ["career.050"]
}

// ── career model ──
export interface CareerRequiredNode {
  node: string;        // Corresponding knowledge node ID
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
  threshold: number; // The threshold for sum(weighted)
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

// ── Recommended DTO ──
export type RecKind = 'knowledge' | 'skill_strand' | 'career_gap' | 'unit' | 'video' | 'career';

export interface RecommendationItem {
  id: string;
  kind: RecKind;
  title: string;
  reason: string;
  confidence: number; // 0..1
  payload?: any; // Evidence/Gap Details
}

