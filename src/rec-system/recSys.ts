// src/rec-system/recSys.ts
// 这是把你当前 recSys.py 迁移到前端的 TypeScript 版本
// 前端可以直接 import 调用，无需 Python 后端

// ========== 0. 引入静态 JSON（路径按项目实际结构修改） ==========
import mockUsersRaw from '../../assets/data/mock_users_progress.json';
import gamesRaw from '../../assets/data/curriculum_games.json';
import careersRaw from '../../assets/data/STEM Careers.json';
import videosRaw from '../../assets/data/discipline_videos.json';

// ========== 1. 类型定义 ==========
export type InquirySkills = Record<string, number>;
export type Knowledge = Record<string, number>;

export interface UserProfile {
  id: string;
  grade?: number;
  knowledge: Knowledge;
  inquiry_skills: InquirySkills;
  career_interests?: string[];
}

export interface Unit {
  id: string;
  title: string;
  kind?: string;
  difficulty: number | string;
  knowledge_nodes: { id: string; weight?: number }[];
  progress_effects?: any;
}

export interface CareerRequiredNode {
  node: string;
  min_level?: number;
  weight?: number;
}

export interface Career {
  id: string;
  title: string;
  min_skill_levels?: Record<string, number>;
  required_knowledge?: CareerRequiredNode[];
  threshold?: number;
  discipline?: string;
}

export interface Video {
  id: string;
  title: string;
  discipline?: string | null;
  career_id?: string | null;
  video_url?: string | null;
}

export type Confidence = 'high' | 'medium' | 'low';

export interface RecItem {
  id: string;
  title: string;
  whyThis: string;
  confidence: Confidence;
}

export interface CareerRecItem extends RecItem {
  evidence: string[];
}

export interface RecResult {
  user: {
    id: string;
    grade?: number;
    isColdStart: boolean;
    knowledge: Knowledge;
    inquiry_skills: InquirySkills;
  };
  recommendations: {
    units: RecItem[];
    videos: RecItem[];
    careers: CareerRecItem[];
  };
  meta: {
    generatedAt: string;
  };
}

// ========== 2. 全局配置（和 Python 一致） ==========
const TOPK = 3;                      // units 和 careers 都取前 3 个
const ONLY_NEXT_LEVEL_UNITS = true;  // 只推荐“下一等级”的活动
const HIDE_CAREERS_ON_COLDSTART = false;
const MAX_DIFFICULTY = 3;

// ========== 3. 工具函数 ==========
function parseDifficulty(raw: any): number {
  if (typeof raw === 'number') {
    return Math.trunc(raw);
  }
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (['beginner', 'easy', 'low'].includes(s)) return 1;
    if (['core', 'medium', 'moderate', 'normal'].includes(s)) return 2;
    if (['challenge', 'challenging', 'hard', 'difficult'].includes(s)) return 3;
    const n = parseInt(s, 10);
    if (!isNaN(n)) return n;
  }
  return 1;
}

function subjectLabelFromNode(nodeId?: string | null): string {
  if (!nodeId) return 'this topic';
  const up = nodeId.toUpperCase();
  if (up.startsWith('BIO')) return 'Biological Sciences';
  if (up.startsWith('CHEM')) return 'Chemical Sciences';
  if (up.startsWith('PHYS') || up.startsWith('PHYSICAL')) return 'Physical Sciences';
  if (up.startsWith('EARTH')) return 'Earth & Space Sciences';
  return 'Science';
}

function parseYearFromNode(nodeId?: string | null): string {
  if (!nodeId) return '';
  const parts = nodeId.split('.');
  for (const p of parts) {
    if (p.startsWith('Y')) return p;
  }
  return '';
}

function confidenceFromScore(score: number): Confidence {
  if (score >= 0.75) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

function isColdStart(user: UserProfile): boolean {
  const knSum = Object.values(user.knowledge || {}).reduce((a, b) => a + b, 0);
  const skSum = Object.values(user.inquiry_skills || {}).reduce((a, b) => a + b, 0);
  return knSum === 0 && skSum === 0;
}

// ========== 4. 从 JSON 构造用户 / 游戏 / 视频 / 职业 ==========
function loadUsersFromJson(raw: any): UserProfile[] {
  const arr: any[] = Array.isArray(raw)
    ? raw
    : raw && Array.isArray(raw.users)
    ? raw.users
    : [];

  const users: UserProfile[] = [];

  arr.forEach((u, idx) => {
    const uid: string = u.user_id || u.id || `user-${idx + 1}`;
    const gradeRaw = u.year ?? u.grade ?? undefined;
    const grade =
      typeof gradeRaw === 'number'
        ? gradeRaw
        : gradeRaw && !isNaN(parseInt(String(gradeRaw), 10))
        ? parseInt(String(gradeRaw), 10)
        : undefined;

    const inqSrc = u.skills_levels || u.inquiry_skills || {};
    const inquiry_skills: InquirySkills = {};
    Object.entries(inqSrc || {}).forEach(([k, v]) => {
      inquiry_skills[k] = Number(v) || 0;
    });

    const knSrc = u.knowledge_progress || u.knowledge || [];
    const knowledge: Knowledge = {};
    if (Array.isArray(knSrc)) {
      knSrc.forEach((item: any) => {
        const node = item?.node;
        const lvl = item?.level ?? 0;
        if (node) knowledge[node] = Number(lvl) || 0;
      });
    } else if (knSrc && typeof knSrc === 'object') {
      Object.entries(knSrc).forEach(([k, v]) => {
        knowledge[k] = Number(v) || 0;
      });
    }

    users.push({
      id: uid,
      grade,
      inquiry_skills,
      knowledge,
      career_interests: u.career_interests || [],
    });
  });

  return users;
}

function loadGamesAsUnitsFromJson(raw: any): Unit[] {
  const games: any[] = Array.isArray(raw)
    ? raw
    : raw && Array.isArray(raw.games)
    ? raw.games
    : [];

  const units: Unit[] = games.map((g: any) => {
    const pe = g.progress_effects || {};
    const peKn = pe.knowledge || {};
    const nodeId = peKn.node || g.node_id || g.code;
    const knowledge_nodes = nodeId ? [{ id: String(nodeId), weight: 1.0 }] : [];
    return {
      id: String(g.id),
      title: g.title || g.id,
      kind: 'game',
      difficulty: parseDifficulty(g.difficulty ?? 1),
      knowledge_nodes,
      progress_effects: g.progress_effects,
    };
  });

  return units;
}

function loadVideosFromJson(raw: any): Video[] {
  const arr: any[] = Array.isArray(raw)
    ? raw
    : raw && Array.isArray(raw.videos)
    ? raw.videos
    : [];

  const videos: Video[] = arr.map((v: any, idx: number) => {
    if (v && typeof v === 'object') {
      return {
        id: v.id || `video-${idx + 1}`,
        title: v.title || `Scientist video ${idx + 1}`,
        discipline: v.discipline ?? null,
        career_id: v.career_id ?? null,
        video_url: v.video_url ?? null,
      };
    } else {
      return {
        id: `video-${idx + 1}`,
        title: String(v),
        discipline: null,
        career_id: null,
        video_url: null,
      };
    }
  });

  return videos;
}

function loadCareersFromJson(raw: any): Career[] {
  // 对应 Python: 只用 STEM Careers.json
  const arr: any[] = Array.isArray(raw)
    ? raw
    : raw && Array.isArray(raw.careers)
    ? raw.careers
    : [];

  const careers: Career[] = arr.map((c: any) => ({
    id: c.id || c.career_id,
    title: c.title || c.name,
    min_skill_levels: c.min_skill_levels || {},
    required_knowledge: c.required_knowledge || [],
    threshold: c.threshold ?? 0,
    discipline: c.discipline,
  }));

  return careers;
}

// ========== 5. 用户辅助 & 单元选择 ==========
function filterUnits(units: Unit[]): Unit[] {
  return units.filter((u) => {
    const diff = parseDifficulty(u.difficulty);
    if (MAX_DIFFICULTY && diff > MAX_DIFFICULTY) return false;
    return true;
  });
}

function compareTuple(a: [boolean, number], b: [boolean, number]): number {
  // Python 用的是 tuple 比较：优先比较第一个，再比较第二个
  if (a[0] === b[0]) {
    if (a[1] === b[1]) return 0;
    return a[1] > b[1] ? 1 : -1;
  }
  return a[0] ? 1 : -1;
}

function pickNextLevelUnits(units: Unit[], user: UserProfile): Unit[] {
  const have = user.knowledge || {};
  const best: Record<string, { level: number; unit: Unit }> = {};

  for (const u of units) {
    const kns = u.knowledge_nodes || [];
    if (!kns.length) continue;
    const node = kns[0].id;
    const curLv = Number(have[node] || 0);
    const unitLv = parseDifficulty(u.difficulty);
    if (unitLv <= curLv) continue;

    const prev = best[node];

    const rank = (x: number): [boolean, number] => [x === curLv + 1, -x];

    if (!prev || compareTuple(rank(unitLv), rank(prev.level)) > 0) {
      best[node] = { level: unitLv, unit: u };
    }
  }

  return Object.values(best).map((v) => v.unit);
}

// ========== 6. 打分 & whyThis ==========
function scoreUnit(unit: Unit, user: UserProfile): { raw: number; signals: string[] } {
  let raw = 0;
  for (const kn of unit.knowledge_nodes || []) {
    const nodeId = kn.id;
    const w = kn.weight != null ? Number(kn.weight) : 1.0;
    const have = Number(user.knowledge[nodeId] || 0);
    const gap = have === 0 ? 1.0 : 0.6;
    raw += w * gap;
  }
  if (parseDifficulty(unit.difficulty) === 3) {
    raw *= 0.95;
  }
  const signals = (unit.knowledge_nodes || []).map((kn) => kn.id);
  return { raw, signals };
}

function buildWhyForUnit(user: UserProfile, signals: string[]): string {
  const userKn = user.knowledge || {};
  if (signals && signals.length > 0) {
    const node = signals[0];
    const subject = subjectLabelFromNode(node);
    const year = parseYearFromNode(node);
    const hasSame = Object.keys(userKn).some(
      (k) => subjectLabelFromNode(k) === subject,
    );
    if (hasSame) {
      return `You’ve already learned some ${subject}, so this ${year || ''} activity is the next step to extend it.`.trim();
    } else {
      return `This activity introduces ${subject} at a level that suits you.`;
    }
  }
  return 'This activity is a good next step for your science learning.';
}

function scoreCareer(
  career: Career,
  user: UserProfile,
): {
  score: number;
  gate_pass: boolean;
  threshold_pass: boolean;
  unmet_skills: [string, number][];
  unmet_nodes: {
    node: string;
    need: number;
    have: number;
    w: number;
  }[];
  covered: number;
  total_w: number;
} {
  const userKn = user.knowledge || {};
  const userSk = user.inquiry_skills || {};

  const minSk = career.min_skill_levels || {};
  const unmetSkills: [string, number][] = [];
  Object.entries(minSk).forEach(([k, v]) => {
    const need = Number(v) || 0;
    const have = Number(userSk[k] || 0);
    if (have < need) unmetSkills.push([k, need]);
  });
  const gatePass = unmetSkills.length === 0;

  const reqKn = career.required_knowledge || [];
  let covered = 0;
  let totalW = 0;
  const unmetNodes: {
    node: string;
    need: number;
    have: number;
    w: number;
  }[] = [];

  for (const rk of reqKn) {
    const node = rk.node;
    if (!node) continue;
    const need = rk.min_level != null ? Number(rk.min_level) : 1;
    const w = rk.weight != null ? Number(rk.weight) : 1.0;
    totalW += w;
    const have = Number(userKn[node] || 0);
    if (have >= need) {
      covered += w;
    } else {
      unmetNodes.push({ node, need, have, w });
    }
  }

  const threshold = career.threshold != null ? Number(career.threshold) : 0;
  const thresholdPass = threshold > 0 ? covered >= threshold * 0.4 : true;

  const base = totalW > 0 ? covered / totalW : 0;
  let score: number;
  if (gatePass && thresholdPass) {
    score = base;
  } else if (thresholdPass && !gatePass) {
    score = Math.max(0.4, base * 0.6);
  } else {
    score = base * 0.6;
  }
  if (score === 0) score = 0.45;

  unmetNodes.sort((a, b) => b.w - a.w);

  return {
    score,
    gate_pass: gatePass,
    threshold_pass: thresholdPass,
    unmet_skills: unmetSkills,
    unmet_nodes: unmetNodes,
    covered,
    total_w: totalW,
  };
}

function buildWhyForCareer(
  _user: UserProfile,
  _career: Career,
  scored: ReturnType<typeof scoreCareer>,
): string {
  const parts: string[] = [
    'This career is connected to the science areas you’ve been learning.',
  ];
  const niceSkillNames: Record<string, string> = {
    QP: 'questioning & predicting',
    PC: 'planning & conducting',
    PAD: 'processing & analysing data',
    EVAL: 'evaluating',
    COMM: 'communicating',
  };
  if (!scored.gate_pass && scored.unmet_skills.length > 0) {
    const missing = scored.unmet_skills
      .slice(0, 2)
      .map(([sk]) => niceSkillNames[sk] || sk);
    parts.push('You still need inquiry skills like ' + missing.join(', ') + '.');
  }
  if (!scored.threshold_pass && scored.unmet_nodes.length > 0) {
    const top = scored.unmet_nodes[0];
    parts.push(
      `You also need a bit more on ${subjectLabelFromNode(top.node)}.`,
    );
  }
  parts.push('We relaxed the rules to show this career to you now.');
  return parts.join(' ');
}

// ========== 7. 视频匹配 ==========
function selectVideosForUser(
  user: UserProfile,
  videos: Video[],
  pickedCareers: CareerRecItem[],
  limit: number = 2,
): RecItem[] {
  const userDisciplines = new Set<string>();
  Object.keys(user.knowledge || {}).forEach((node) => {
    userDisciplines.add(subjectLabelFromNode(node));
  });

  const careerIds = new Set<string>();
  pickedCareers.forEach((c) => {
    if (c.id) careerIds.add(c.id);
  });

  const picked: RecItem[] = [];

  // 1) career_id 精确匹配
  for (const v of videos) {
    if (picked.length >= limit) break;
    if (v.career_id && careerIds.has(String(v.career_id))) {
      picked.push({
        id: v.id,
        title: v.title,
        whyThis: 'This video is about the career we just recommended to you.',
        confidence: 'high',
      });
    }
  }

  // 2) 学科匹配
  for (const v of videos) {
    if (picked.length >= limit) break;
    const vd = v.discipline;
    if (vd && userDisciplines.has(vd)) {
      picked.push({
        id: v.id,
        title: v.title,
        whyThis: `This video is related to the ${vd} you are learning.`,
        confidence: 'medium',
      });
    }
  }

  return picked;
}

// ========== 8. 一次性加载静态数据（代替 Python 那几行 load_XXX） ==========
export const MOCK_USERS: UserProfile[] = loadUsersFromJson(mockUsersRaw as any);
const GAMES: Unit[] = loadGamesAsUnitsFromJson(gamesRaw as any);
const CAREERS: Career[] = loadCareersFromJson(careersRaw as any);
const VIDEOS: Video[] = loadVideosFromJson(videosRaw as any);

// ========== 9. 主推荐函数（对应 Python 的 get_recommendations_for_user） ==========
export function getRecommendationsForProfile(user: UserProfile): RecResult {
  // --- units ---
  const filteredUnits = filterUnits(GAMES);
  const nextLevelUnits = ONLY_NEXT_LEVEL_UNITS
    ? pickNextLevelUnits(filteredUnits, user)
    : filteredUnits;
  const unitsForScoring = nextLevelUnits.length ? nextLevelUnits : filteredUnits;

  const unitScored = unitsForScoring.map((u) => ({
    u,
    ...scoreUnit(u, user),
  }));

  const maxRaw =
    unitScored.length > 0
      ? Math.max(...unitScored.map((x) => x.raw))
      : 1e-6;

  unitScored.sort((a, b) => b.raw - a.raw);

  const unitsOut: RecItem[] = unitScored.slice(0, TOPK).map((x) => {
    const scoreNorm = x.raw / maxRaw;
    return {
      id: x.u.id,
      title: x.u.title || x.u.id,
      whyThis: buildWhyForUnit(user, x.signals),
      confidence: confidenceFromScore(scoreNorm),
    };
  });

  // --- careers ---
  const careersAll: CareerRecItem[] = [];
  if (!(isColdStart(user) && HIDE_CAREERS_ON_COLDSTART)) {
    for (const c of CAREERS) {
      const s = scoreCareer(c, user);
      const confidence = confidenceFromScore(s.score);
      careersAll.push({
        id: c.id,
        title: c.title,
        whyThis: buildWhyForCareer(user, c, s),
        confidence,
        evidence: [
          `covered=${s.covered.toFixed(2)}`,
          `required_threshold=${c.threshold ?? 0} (relaxed to 40%)`,
        ],
      });
    }
    // Python: sorted(careers_out, key=lambda x: x["confidence"], reverse=True)
    // 字符串逆序：'medium' > 'low' > 'high'
    careersAll.sort((a, b) => {
      if (a.confidence === b.confidence) return 0;
      return a.confidence < b.confidence ? 1 : -1;
    });
  }

  const careersTop = careersAll.slice(0, TOPK);

  // --- videos ---
  const videosOut = selectVideosForUser(user, VIDEOS, careersTop, 2);

  // --- 输出结构和 Python 一致 ---
  const result: RecResult = {
    user: {
      id: user.id,
      grade: user.grade,
      isColdStart: isColdStart(user),
      knowledge: user.knowledge,
      inquiry_skills: user.inquiry_skills,
    },
    recommendations: {
      units: unitsOut,
      videos: videosOut,
      careers: careersTop,
    },
    meta: {
      generatedAt: new Date().toISOString(),
    },
  };

  return result;
}

// ========== 10. 方便用 mock 用户 ID 调用 ==========
export function getRecommendationsForUserId(userId: string): RecResult {
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }
  return getRecommendationsForProfile(user);
}
