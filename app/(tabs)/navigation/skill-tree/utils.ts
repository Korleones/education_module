import { 
  DisciplineNode, 
  SkillNode, 
  NodeStatus, 
  UserData, 
  SkillLevel, 
} from './types';

/** 
 * Skill code → meta info 
 * Used to generate skill nodes and display consistent labels.
 */
const SKILL_CODE_MAP: Record<string, { code: keyof SkillLevel; name: string }> = {
  'QP': { code: 'QP', name: 'Questioning & Predicting' },
  'PC': { code: 'PC', name: 'Planning & Conducting' },
  'PAD': { code: 'PAD', name: 'Processing & Analysing Data' },
  'EVAL': { code: 'EVAL', name: 'Evaluating' },
  'COMM': { code: 'COMM', name: 'Communicating' }
};

/**
 * Maps each year (3–10) to its corresponding skill level (1–8).
 */
const YEAR_TO_LEVEL: Record<number, number> = {
  3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8
};

/**
 * Generate all 40 skill nodes  
 * (5 skill strands × 8 levels)
 */
export function generateSkillNodes(): SkillNode[] {
  const skillNodes: SkillNode[] = [];
  
  Object.entries(SKILL_CODE_MAP).forEach(([code, info]) => {
    for (let level = 1; level <= 8; level++) {
      const year = Object.keys(YEAR_TO_LEVEL).find(
        y => YEAR_TO_LEVEL[parseInt(y)] === level
      );
      
      skillNodes.push({
        id: `INQ.Y${parseInt(year!)}.${code}`,
        type: 'skill',
        skillCode: code,
        skillName: info.name,
        level: level,
        year: parseInt(year!),
        title: `${info.name} - Level ${level}`,
        description: `${info.name} skill for Year ${year} (Level ${level})`
      });
    }
  });
  
  return skillNodes;
}

/**
 * Determine the status of a skill node for a given user  
 * Status depends on the user's skill_levels.
 */
export function calculateSkillNodeStatus(
  skillNode: SkillNode,
  userData: UserData
): { status: NodeStatus; currentLevel?: number } {
  const { skillCode, level } = skillNode;
  const userSkillLevel = userData.skills_levels[skillCode as keyof SkillLevel];
  
  // Earned if the user has reached or exceeded the required level
  if (userSkillLevel >= level) {
    return { status: 'earned', currentLevel: level };
  }
  
  // Available if level 1 OR previous level is earned
  if (level === 1 || userSkillLevel >= level - 1) {
    return { status: 'available' };
  }
  
  // Otherwise locked
  return { status: 'locked' };
}

/**
 * Determine the status of a discipline node
 * Status depends on:
 *   - user's knowledge_progress
 *   - prerequisite discipline nodes
 *   - supporting skill levels
 */
export function calculateDisciplineNodeStatus(
  node: DisciplineNode,
  userData: UserData,
  allDisciplineNodes: DisciplineNode[],
  allSkillNodes: SkillNode[]
): { status: NodeStatus; currentLevel?: number } {
  const { knowledge_progress } = userData;
  
  // 1. Check whether the user has direct progress on this discipline node
  const nodeProgress = knowledge_progress.find(p => p.node === node.id);
  
  if (nodeProgress) {
    if (nodeProgress.level >= 3) {
      return { status: 'earned', currentLevel: 3 };
    } else {
      return { status: 'in-progress', currentLevel: nodeProgress.level };
    }
  }
  
  // 2. Check whether all prerequisites are completed
  const allPrerequisitesCompleted = checkAllPrerequisites(
    node,
    userData,
    allDisciplineNodes,
    allSkillNodes
  );
  
  if (allPrerequisitesCompleted) {
    return { status: 'available' };
  }
  
  // 3. If prerequisites not met → locked
  return { status: 'locked' };
}

/**
 * Check if ALL prerequisites of a discipline node are satisfied:
 *   - required skill levels (reinforced_by)
 *   - previous-year discipline node
 *   - any node that links to this one via progression_to
 */
function checkAllPrerequisites(
  node: DisciplineNode,
  userData: UserData,
  allDisciplineNodes: DisciplineNode[],
  allSkillNodes: SkillNode[]
): boolean {
  
  /**  
   * 1. Check reinforced_by →  
   * Required skill levels such as: `INQ.Y5.QP`
   */
  for (const reinforcedBy of node.reinforced_by) {
    const parts = reinforcedBy.split('.');
    if (parts.length >= 3) {
      const yearStr = parts[1];  // e.g., 'Y3'
      const skillCode = parts[2];
      
      const year = parseInt(yearStr.replace('Y', ''));
      const requiredLevel = YEAR_TO_LEVEL[year];
      
      const userSkillLevel = userData.skills_levels[skillCode as keyof SkillLevel];
      
      if (userSkillLevel < requiredLevel) return false;
    }
  }
  
  /**
   * 2. Check previous year discipline node in same strand  
   * Must be earned (level 3)
   */
  const prevYearNode = allDisciplineNodes.find(n => 
    n.discipline === node.discipline && 
    n.year === node.year - 1
  );
  
  if (prevYearNode) {
    const prevNodeProgress = userData.knowledge_progress.find(p => p.node === prevYearNode.id);
    if (!prevNodeProgress || prevNodeProgress.level < 3) return false;
  }
  
  /**
   * 3. Check other discipline nodes that connect via progression_to
   */
  const prerequisiteNodes = allDisciplineNodes.filter(n => n.progression_to === node.id);
  
  for (const prereq of prerequisiteNodes) {
    const prereqProgress = userData.knowledge_progress.find(p => p.node === prereq.id);
    if (!prereqProgress || prereqProgress.level < 3) return false;
  }
  
  return true;
}

/**
 * Compute XY layout positions for all nodes
 * Includes both discipline nodes and skill nodes
 */
export function calculateLayout(
  disciplineNodes: DisciplineNode[],
  skillNodes: SkillNode[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  // Layout constants
  const DISCIPLINE_START_X = 400;
  const SKILL_START_X = 100;
  const HORIZONTAL_SPACING = 180;
  const VERTICAL_SPACING = 150;
  const START_Y = 100;
  
  const disciplineOrder = [
    'Biological Sciences',
    'Chemical Sciences',
    'Earth & Space Sciences',
    'Physical Sciences'
  ];
  
  const skillOrder = ['QP', 'PC', 'PAD', 'EVAL', 'COMM'];
  
  /** Skill nodes (left column) */
  skillNodes.forEach((skillNode) => {
    const skillIndex = skillOrder.indexOf(skillNode.skillCode);
    const x = SKILL_START_X;
    const y = START_Y + (skillNode.level - 1) * VERTICAL_SPACING + skillIndex * 35;
    
    positions.set(skillNode.id, { x, y });
  });
  
  /** Discipline nodes (right grid) */
  disciplineNodes.forEach((node) => {
    const disciplineIndex = disciplineOrder.indexOf(node.discipline);
    const yearIndex = node.year - 3;
    
    const x = DISCIPLINE_START_X + yearIndex * HORIZONTAL_SPACING;
    const y = START_Y + disciplineIndex * VERTICAL_SPACING;
    
    positions.set(node.id, { x, y });
  });
  
  return positions;
}

/**
 * Map status → color used in drawing nodes
 */
export function getNodeColor(status: NodeStatus): string {
  const statusColors = {
    locked: '#9E9E9E',
    available: '#2196F3',
    'in-progress': '#FF9800',
    earned: '#4CAF50'
  };
  
  return statusColors[status];
}

/**
 * Get color for discipline strands
 */
export function getDisciplineColor(discipline: string): string {
  const colors: Record<string, string> = {
    'Biological Sciences': '#4CAF50',
    'Chemical Sciences': '#9C27B0',
    'Earth & Space Sciences': '#FF9800',
    'Physical Sciences': '#2196F3'
  };
  
  return colors[discipline] || '#999999';
}

/**
 * Get short abbreviation for a discipline
 */
export function getDisciplineAbbreviation(discipline: string): string {
  const abbreviations: Record<string, string> = {
    'Biological Sciences': 'BIO',
    'Chemical Sciences': 'CHEM',
    'Earth & Space Sciences': 'EARTH',
    'Physical Sciences': 'PHYS'
  };
  
  return abbreviations[discipline] || 'UNK';
}

/**
 * Get (abbr + icon) for a skill strand
 */
export function getSkillInfo(skillCode: string): { abbr: string; icon: string } {
  const skillInfo: Record<string, { abbr: string; icon: string }> = {
    'QP': { abbr: 'QP', icon: '❓' },
    'PC': { abbr: 'PC', icon: '📋' },
    'PAD': { abbr: 'PAD', icon: '📊' },
    'EVAL': { abbr: 'EVAL', icon: '✅' },
    'COMM': { abbr: 'COMM', icon: '💬' }
  };
  
  return skillInfo[skillCode] || { abbr: skillCode, icon: '⭐' };
}

/**
 * Updates a user's skill or discipline progress  
 * Then returns the updated userData.
 */
export function updateNodeStatusAndRecalculate(
  nodeId: string,
  newStatus: NodeStatus,
  newLevel: number,
  userData: UserData,
  allDisciplineNodes: DisciplineNode[],
  allSkillNodes: SkillNode[]
): UserData {
  const updatedUserData = { ...userData };
  
  const isDisciplineNode = nodeId.includes('AC9S'); // discipline node IDs
  
  /** Discipline node update logic */
  if (isDisciplineNode) {
    const progressIndex = updatedUserData.knowledge_progress.findIndex(p => p.node === nodeId);
    
    if (newStatus === 'earned') {
      if (progressIndex >= 0) {
        updatedUserData.knowledge_progress[progressIndex] = { node: nodeId, level: 3 };
      } else {
        updatedUserData.knowledge_progress.push({ node: nodeId, level: 3 });
      }
    } 
    else if (newStatus === 'in-progress') {
      if (progressIndex >= 0) {
        updatedUserData.knowledge_progress[progressIndex] = { node: nodeId, level: newLevel };
      } else {
        updatedUserData.knowledge_progress.push({ node: nodeId, level: newLevel });
      }
    } 
    else if (newStatus === 'locked' || newStatus === 'available') {
      if (progressIndex >= 0) {
        updatedUserData.knowledge_progress.splice(progressIndex, 1);
      }
    }
  } 
  
  /** Skill node update logic */
  else {
    const skillNode = allSkillNodes.find(n => n.id === nodeId);
    if (skillNode) {
      const skillCode = skillNode.skillCode as keyof SkillLevel;
      
      if (newStatus === 'earned') {
        updatedUserData.skills_levels[skillCode] = skillNode.level;
      } 
      else if (newStatus === 'available') {
        updatedUserData.skills_levels[skillCode] = skillNode.level - 1;
      } 
      else if (newStatus === 'locked') {
        updatedUserData.skills_levels[skillCode] = Math.max(0, skillNode.level - 2);
      }
    }
  }
  
  return updatedUserData;
}

/**
 * Build all connections for visualization:
 *   - discipline progression (discipline → discipline)
 *   - skill reinforcement (skill → discipline)
 *   - skill chains (skill level N → level N+1)
 */
export function getAllConnections(
  disciplineNodes: DisciplineNode[],
  skillNodes: SkillNode[],
  positions: Map<string, { x: number; y: number }>
): Array<{ from: string; to: string; type: 'progression' | 'reinforcement' | 'skill-chain' }> {
  
  const connections: Array<{ from: string; to: string; type: 'progression' | 'reinforcement' | 'skill-chain' }> = [];
  
  /** 1. Discipline → progression_to */
  disciplineNodes.forEach(node => {
    if (node.progression_to && positions.has(node.progression_to)) {
      connections.push({
        from: node.id,
        to: node.progression_to,
        type: 'progression'
      });
    }
  });
  
  /** 2. Skill → reinforce → discipline */
  disciplineNodes.forEach(node => {
    node.reinforced_by.forEach(skillId => {
      if (positions.has(skillId)) {
        connections.push({
          from: skillId,
          to: node.id,
          type: 'reinforcement'
        });
      }
    });
  });
  
  /** 3. Skill chains (level 1 → 2 → 3 → …) */
  const skillsByCode = new Map<string, SkillNode[]>();
  skillNodes.forEach(node => {
    if (!skillsByCode.has(node.skillCode)) {
      skillsByCode.set(node.skillCode, []);
    }
    skillsByCode.get(node.skillCode)!.push(node);
  });
  
  skillsByCode.forEach(nodes => {
    const sorted = nodes.sort((a, b) => a.level - b.level);
    for (let i = 0; i < sorted.length - 1; i++) {
      connections.push({
        from: sorted[i].id,
        to: sorted[i + 1].id,
        type: 'skill-chain'
      });
    }
  });
  
  return connections;
}
