import { 
  DisciplineNode, 
  SkillNode, 
  NodeStatus, 
  UserData, 
  SkillLevel 
} from './types';

/* ---------------------------------------------------------
   Skill code map
--------------------------------------------------------- */
const SKILL_CODE_MAP: Record<string, { code: keyof SkillLevel; name: string }> = {
  QP: { code: 'QP', name: 'Questioning & Predicting' },
  PC: { code: 'PC', name: 'Planning & Conducting' },
  PAD: { code: 'PAD', name: 'Processing & Analysing Data' },
  EVAL: { code: 'EVAL', name: 'Evaluating' },
  COMM: { code: 'COMM', name: 'Communicating' }
};

const YEAR_TO_LEVEL: Record<number, number> = {
  3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8
};

/* ---------------------------------------------------------
   Generate all skill nodes
--------------------------------------------------------- */
export function generateSkillNodes(): SkillNode[] {
  const skillNodes: SkillNode[] = [];

  Object.entries(SKILL_CODE_MAP).forEach(([code, info]) => {
    for (let level = 1; level <= 8; level++) {
      const year = Number(
        Object.keys(YEAR_TO_LEVEL).find(
          y => YEAR_TO_LEVEL[parseInt(y)] === level
        )
      );

      skillNodes.push({
        id: `INQ.Y${year}.${code}`,
        type: 'skill',
        skillCode: code,
        skillName: info.name,
        level,
        year,
        title: `${info.name} - Level ${level}`,
        description: `${info.name} skill for Year ${year} (Level ${level})`
      });
    }
  });

  return skillNodes;
}

/* ---------------------------------------------------------
   Skill node status (unchanged)
--------------------------------------------------------- */
export function calculateSkillNodeStatus(
  skillNode: SkillNode,
  userData: UserData
): { status: NodeStatus; currentLevel?: number } {

  const { skillCode, level } = skillNode;
  const userSkill = userData.skills_levels[skillCode as keyof SkillLevel];

  if (userSkill >= level) return { status: 'earned', currentLevel: level };
  if (level === 1 || userSkill >= level - 1) return { status: 'available' };
  return { status: 'locked' };
}

/* ---------------------------------------------------------
   FULL DISCIPLINE LOGIC — FINAL VERSION
--------------------------------------------------------- */
export function calculateDisciplineNodeStatus(
  node: DisciplineNode,
  userData: UserData,
  allDisciplineNodes: DisciplineNode[],
  allSkillNodes: SkillNode[]
): { status: NodeStatus; currentLevel?: number } {

  const studentYear = userData.year;
  const nodeYear = Number((node as any).year);

  const sameDisciplineNodes = allDisciplineNodes.filter(
    n => n.discipline === node.discipline
  );

  const learnedProgress = userData.knowledge_progress
    .map(p => ({
      progress: p,
      node: sameDisciplineNodes.find(n => n.id === p.node)
    }))
    .filter(x => x.node)
    .map(x => ({
      year: Number((x.node as any).year),
      level: x.progress.level,
      id: x.node!.id
    }));

  /* ======================================================
     Case A: 学生从未学过该学科 → 当前年级 in-progress
  ====================================================== */
  if (learnedProgress.length === 0) {
    if (nodeYear < studentYear) return { status: 'earned', currentLevel: 3 };
    if (nodeYear === studentYear) return { status: 'in-progress', currentLevel: 1 };
    return { status: 'locked' };
  }

  /* ======================================================
     Case B: 学生学过该学科 → 找最新 year
  ====================================================== */
  const maxYearRec = learnedProgress.reduce((a, b) =>
    a.year > b.year ? a : b
  );

  const latestYear = maxYearRec.year;
  const isLatestNode = maxYearRec.id === node.id;

  if (nodeYear < latestYear) return { status: 'earned', currentLevel: 3 };
  if (isLatestNode) return { status: 'in-progress', currentLevel: maxYearRec.level };

  return { status: 'locked' };
}

/* ---------------------------------------------------------
   Layout – unchanged (your earlier version)
--------------------------------------------------------- */

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function calculateLayout(
  disciplineNodes: DisciplineNode[],
  skillNodes: SkillNode[]
): Map<string, { x: number; y: number }> {

  const positions = new Map<string, { x: number; y: number }>();

  const DISCIPLINE_START_X = 300;
  const HORIZONTAL_SPACING = 450;
  const VERTICAL_SPACING = 170;
  const START_Y = 120;

  const disciplineOrder = [
    'Biological Sciences',
    'Chemical Sciences',
    'Earth & Space Sciences',
    'Physical Sciences'
  ];

  disciplineNodes.forEach(node => {
    const col = disciplineOrder.indexOf(node.discipline);
    const row = node.year - 3;

    const x = DISCIPLINE_START_X + col * HORIZONTAL_SPACING;
    const y = START_Y + row * VERTICAL_SPACING;

    positions.set(node.id, { x, y });
  });

  function resolveOverlap(x: number, y: number) {
    let fx = x;
    let fy = y;

    for (const p of positions.values()) {
      const dx = p.x - fx;
      const dy = p.y - fy;

      if (Math.sqrt(dx * dx + dy * dy) < 110) {
        fy -= 140;
      }
    }

    return { x: fx, y: Math.max(fy, 60) };
  }

  skillNodes.forEach(skill => {
    const targets = disciplineNodes.filter(d => d.reinforced_by.includes(skill.id));

    if (targets.length === 0) {
      positions.set(skill.id, resolveOverlap(120, START_Y + skill.level * 150));
      return;
    }

    let avgX = 0, avgY = 0;
    targets.forEach(t => {
      const p = positions.get(t.id)!;
      avgX += p.x;
      avgY += p.y;
    });
    avgX /= targets.length;
    avgY /= targets.length;

    const sx = avgX + (Math.random() < 0.5 ? -120 : 120);
    const sy = avgY + (Math.random() * 40 - 20);

    positions.set(skill.id, resolveOverlap(sx, sy));
  });

  return positions;
}

/* ---------------------------------------------------------
   Update user progress
--------------------------------------------------------- */
export function updateNodeStatusAndRecalculate(
  nodeId: string,
  newStatus: NodeStatus,
  newLevel: number,
  userData: UserData,
  allDisciplineNodes: DisciplineNode[],
  allSkillNodes: SkillNode[]
): UserData {

  const updated = {
    ...userData,
    skills_levels: { ...userData.skills_levels },
    knowledge_progress: [...userData.knowledge_progress]
  };

  const disciplineNode = allDisciplineNodes.find(d => d.id === nodeId);
  const isDiscipline = !!disciplineNode;

  if (isDiscipline) {
    const idx = updated.knowledge_progress.findIndex(p => p.node === nodeId);

    if (newStatus === 'earned' || newStatus === 'in-progress') {
      const lev = newStatus === 'earned' ? 3 : newLevel;
      if (idx >= 0) updated.knowledge_progress[idx] = { node: nodeId, level: lev };
      else updated.knowledge_progress.push({ node: nodeId, level: lev });
    } else if (idx >= 0) {
      updated.knowledge_progress.splice(idx, 1);
    }
  } else {
    const skillNode = allSkillNodes.find(s => s.id === nodeId);
    if (!skillNode) return updated;

    const code = skillNode.skillCode as keyof SkillLevel;

    if (newStatus === 'earned') updated.skills_levels[code] = skillNode.level;
    else if (newStatus === 'available') updated.skills_levels[code] = skillNode.level - 1;
    else if (newStatus === 'locked') updated.skills_levels[code] = Math.max(0, skillNode.level - 2);
  }

  return updated;
}

/* ---------------------------------------------------------
   Build connections
--------------------------------------------------------- */
export function getAllConnections(
  disciplineNodes: DisciplineNode[],
  skillNodes: SkillNode[],
  positions: Map<string, { x: number; y: number }>
) {
  const edges: Array<{ from: string; to: string; type: 'progression' | 'reinforcement' }> = [];

  disciplineNodes.forEach(n => {
    if (n.progression_to && positions.has(n.progression_to)) {
      edges.push({ from: n.id, to: n.progression_to, type: 'progression' });
    }
  });

  disciplineNodes.forEach(n => {
    n.reinforced_by.forEach(s => {
      if (positions.has(s)) {
        edges.push({ from: s, to: n.id, type: 'reinforcement' });
      }
    });
  });

  return edges;
}

/* ---------------------------------------------------------
   Colors
--------------------------------------------------------- */
export function getNodeColor(status: NodeStatus) {
  return {
    locked: '#9E9E9E',
    available: '#2196F3',
    'in-progress': '#FF9800',
    earned: '#4CAF50'
  }[status];
}

export function getDisciplineColor(name: string) {
  return {
    'Biological Sciences': '#4CAF50',
    'Chemical Sciences': '#9C27B0',
    'Earth & Space Sciences': '#FF9800',
    'Physical Sciences': '#2196F3'
  }[name] || '#999';
}

export function getDisciplineAbbreviation(name: string) {
  return {
    'Biological Sciences': 'BIO',
    'Chemical Sciences': 'CHEM',
    'Earth & Space Sciences': 'EARTH',
    'Physical Sciences': 'PHYS'
  }[name] || 'UNK';
}

export function getSkillInfo(code: string) {
  return {
    QP: { abbr: 'QP', icon: '❓' },
    PC: { abbr: 'PC', icon: '📋' },
    PAD: { abbr: 'PAD', icon: '📊' },
    EVAL: { abbr: 'EVAL', icon: '✅' },
    COMM: { abbr: 'COMM', icon: '💬' }
  }[code] || { abbr: code, icon: '⭐' };
}
