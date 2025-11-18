// -------------------------
// Basic shared types
// -------------------------
export type NodeStatus = 'locked' | 'available' | 'in-progress' | 'earned';
export type NodeType = 'discipline' | 'skill';

export interface NodePosition {
  x: number;
  y: number;
}

// -------------------------
// Raw nodes from JSON
// -------------------------
export interface SkillNode {
  id: string;
  type: 'skill';
  skillCode: string;
  skillName: string;
  level: number;
  year: number;
  title: string;
  description: string;
}

export interface DisciplineNode {
  id: string;
  type: 'discipline';
  year: number;
  discipline: string;
  code: string;
  title: string;
  description: string;
  levels: Array<{
    level: number;
    outcomes: string[];
  }>;
  progression_to: string | null;
  similar_to?: string[];
  reinforced_by: string[];
}

// Raw node union
export type BaseNode = DisciplineNode | SkillNode;

// -------------------------
// User data
// -------------------------
export interface SkillLevel {
  QP: number;
  PC: number;
  PAD: number;
  EVAL: number;
  COMM: number;
}

export interface KnowledgeProgress {
  node: string;
  level: number;
}

export interface UserData {
  user_id: string;
  year: number;
  skills_levels: SkillLevel;
  knowledge_progress: KnowledgeProgress[];
}

// -------------------------
// Tree nodes used in UI
// -------------------------
export interface BaseTreeNode {
  id: string;
  nodeType: NodeType;     // <--- unified type field
  status: NodeStatus;
  position: NodePosition;
  title: string;
  description: string;
  year: number;
  currentLevel?: number;
}

// Derived discipline tree node (unchanged shape, unified)
export interface DisciplineTreeNode extends BaseTreeNode {
  nodeType: 'discipline';
  discipline: string;
  code: string;
  levels: Array<{
    level: number;
    outcomes: string[];
  }>;
  reinforced_by: string[];
  progression_to: string | null;
}

// Derived skill tree node
export interface SkillTreeNodeWithData extends BaseTreeNode{
  nodeType: 'skill';
  skillCode: string;
  skillName: string;
  level: number;
}

// Final UI TreeNode union
export type TreeNode = DisciplineTreeNode | SkillTreeNodeWithData;

// -------------------------
// SkillsData from JSON
// -------------------------
export interface MetaData {
  version: string;
  model: string;
  years: number[];
  discipline_list: string[];
  skill_strands: string[];
  skill_level_mapping: Record<string, number>;
}

export interface SkillsData {
  meta: MetaData;
  disciplines: DisciplineNode[];
  skills_progression: any[];
}
