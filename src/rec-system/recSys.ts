// src/rec-system/recSys.ts
// Rule-based 推荐系统的 TypeScript 版本
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

// ========== 2. 全局配置 ==========
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
    if (p.toUpperCase().startsWith('Y')) return p;
  }
  return '';
}

function yearLabelToNumber(label?: string | null): number | null {
  if (!label) return null;
  const m = label.match(/Y(\d+)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return isNaN(n) ? null : n;
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

// 简单字符串 hash，用来做 per-user 抖动
function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash;
}

// 根据年级为 Unit 加一点加成/惩罚
function gradeBoostForUnit(user: UserProfile, unit: Unit): number {
  const ug = user.grade;
  if (ug == null) return 0;

  const nodes = unit.knowledge_nodes || [];
  if (!nodes.length) return 0;

  const yearLabel = parseYearFromNode(nodes[0].id);
  const yg = yearLabelToNumber(yearLabel);
  if (yg == null) return 0;

  const dist = Math.abs(ug - yg);
  if (dist <= 0.5) return 0.3;      // 正好是该年级 → 强加成
  if (dist <= 1.5) return 0.15;     // 相邻年级 → 轻微加成
  if (dist <= 2.5) return 0.05;     // 稍远 → 很小加成
  return -0.05;                     // 太远 → 略微减分
}

// 从 career 的 required_knowledge 中推一个典型年级
function extractCareerMainGrade(career: Career): number | null {
  const req = career.required_knowledge || [];
  const years: number[] = [];
  for (const rk of req) {
    const yLabel = parseYearFromNode(rk.node);
    const yg = yearLabelToNumber(yLabel);
    if (yg != null) years.push(yg);
  }
  if (!years.length) return null;
  const avg = years.reduce((a, b) => a + b, 0) / years.length;
  return Math.round(avg);
}

// 根据用户年级与职业典型年级距离，给 career 一个加成/惩罚
function gradeBoostForCareer(user: UserProfile, career: Career): number {
  const ug = user.grade;
  if (ug == null) return 0;
  const cg = extractCareerMainGrade(career);
  if (cg == null) return 0;

  const dist = Math.abs(ug - cg);
  if (dist <= 0.5) return 0.25;     // 非常适配当前年级
  if (dist <= 1.5) return 0.15;     // 邻近年级
  if (dist <= 2.5) return 0.05;     // 稍远年级
  return -0.1;                      // 太远，略微惩罚
}

// 利用 career_interests 对职业加成
function interestBoostForCareer(user: UserProfile, career: Career): number {
  const interests = (user.career_interests || []).map((s) =>
    String(s || '').toLowerCase(),
  );
  if (!interests.length) return 0;

  const title = (career.title || '').toLowerCase();
  const id = (career.id || '').toLowerCase();
  const discipline = (career.discipline || '').toLowerCase();

  // 强匹配：兴趣里直接提到职业名或 ID
  const strong = interests.some((term) => {
    if (!term) return false;
    return title.includes(term) || id === term;
  });
  if (strong) return 0.3;

  // 中等匹配：兴趣和 discipline 有重叠（例如 "biology" vs "Biological Sciences"）
  const medium = interests.some((term) => {
    if (!term || !discipline) return false;
    return discipline.includes(term) || term.includes(discipline);
  });
  if (medium) return 0.15;

  return 0;
}

// 从职业的 required_knowledge / discipline 总结出学科名称
function subjectSummaryFromCareer(career: Career): string {
  const subjs = new Set<string>();

  (career.required_knowledge || []).forEach((rk) => {
    if (rk.node) subjs.add(subjectLabelFromNode(rk.node));
  });

  if (!subjs.size && career.discipline) {
    subjs.add(career.discipline);
  }

  const arr = Array.from(subjs);
  if (arr.length === 0) return 'science';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr[0]}, ${arr[1]} and other areas of science`;
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

  // 根据年级做一点偏置
  raw += gradeBoostForUnit(user, unit);

  if (parseDifficulty(unit.difficulty) === 3) {
    raw *= 0.95;
  }
  if (raw < 0) raw = 0;

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
    score = base * 0.6;
  } else {
    score = base * 0.3;
  }

  // 很弱的匹配视为 0，知识上几乎没覆盖
  if (score < 0.1) score = 0;

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
  user: UserProfile,
  career: Career,
  scored: ReturnType<typeof scoreCareer>,
): string {
  const parts: string[] = [];
  const title = career.title || career.id;
  const subjSummary = subjectSummaryFromCareer(career);

  // ① 和具体学科挂钩
  if (scored.covered > 0) {
    parts.push(
      `${title} uses the ${subjSummary} you’ve already been learning.`
    );
  } else {
    parts.push(
      `${title} will help you build your ${subjSummary} from where you are now.`
    );
  }

  // ② 兴趣信息（career_interests）
  if (user.career_interests && user.career_interests.length > 0) {
    const interestsLower = user.career_interests.map((x) => x.toLowerCase());
    const hitDiscipline =
      career.discipline &&
      interestsLower.includes(career.discipline.toLowerCase());
    const hitTitle = interestsLower.some((k) =>
      (career.title || '').toLowerCase().includes(k),
    );

    if (hitDiscipline || hitTitle) {
      const what =
        career.discipline && hitDiscipline
          ? career.discipline
          : (career.title || title);
      parts.push(
        `You’ve told us you’re interested in ${what}, so ${title} is a good career to explore.`
      );
    }
  }

  // ③ inquiry skills 缺口（具体点写）
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
    parts.push(
      `To move towards ${title} you still need inquiry skills like ${missing.join(', ')}.`
    );
  }

  // ④ 知识缺口，带具体学科
  if (!scored.threshold_pass && scored.unmet_nodes.length > 0) {
    const top = scored.unmet_nodes[0];
    parts.push(
      `You also need a bit more knowledge in ${subjectLabelFromNode(top.node)}.`
    );
  }

  // ⑤ 年级相关的说明
  if (user.grade != null) {
    if (user.grade <= 6) {
      parts.push(
        `${title} is more of a future goal for you over the next few years.`
      );
    } else if (user.grade <= 10) {
      parts.push(
        `At your year level it’s a good time to start exploring what ${title} involves.`
      );
    } else {
      parts.push(
        `At your year level you can already start planning the study pathway towards ${title}.`
      );
    }
  }

  // ⑥ 放宽规则也写清楚
  if (!scored.gate_pass || !scored.threshold_pass) {
    parts.push(
      `We slightly relaxed the rules so you can see ${title} now and understand what to work towards.`
    );
  }

  return parts.join(' ');
}

// ========== 7. 视频匹配（TOP5，多样性控制） ==========
function buildWhyForVideo(
  v: Video,
  user: UserProfile,
  careerIds: Set<string>,
  careerMap: Map<string, CareerRecItem>,
): string {
  const disc = v.discipline || undefined;

  const userDisciplines = new Set<string>();
  Object.keys(user.knowledge || {}).forEach((node) => {
    userDisciplines.add(subjectLabelFromNode(node));
  });

  const cid = v.career_id && String(v.career_id);
  const matchedCareer = cid ? careerMap.get(cid) : undefined;

  if (cid && matchedCareer) {
    return `This video shows what ${matchedCareer.title} looks like in real life.`;
  }

  if (disc && userDisciplines.has(disc)) {
    return `This video is about ${disc}, the science area you are working on at school.`;
  }

  if (disc) {
    return `This video shows another area of ${disc} you might be interested in.`;
  }

  return 'This video gives you another STEM story to explore.';
}

function selectVideosForUser(
  user: UserProfile,
  videos: Video[],
  pickedCareers: CareerRecItem[],
  limit: number = 5,
): RecItem[] {
  const userDisciplines = new Set<string>();
  Object.keys(user.knowledge || {}).forEach((node) => {
    userDisciplines.add(subjectLabelFromNode(node));
  });

  const careerIds = new Set<string>();
  const careerMap = new Map<string, CareerRecItem>();
  pickedCareers.forEach((c) => {
    if (c.id) {
      const id = String(c.id);
      careerIds.add(id);
      careerMap.set(id, c);
    }
  });

  const scoredVideos = videos.map((v) => {
    let score = 0;
    const disc = v.discipline || null;

    if (v.career_id && careerIds.has(String(v.career_id))) {
      score += 3;
    }

    if (disc && userDisciplines.has(disc)) {
      score += 2;
    } else if (disc) {
      score += 0.5;
    }

    if (score === 0 && userDisciplines.size === 0 && careerIds.size === 0) {
      score = 1;
    }

    return { v, score };
  });

  const hasPositive = scoredVideos.some((x) => x.score > 0);
  if (!hasPositive) {
    scoredVideos.forEach((x) => {
      x.score = 1;
    });
  }

  scoredVideos.sort((a, b) => b.score - a.score);

  const picked: RecItem[] = [];
  const usedIds = new Set<string>();
  const disciplineCount = new Map<string, number>();

  // 第一轮：限制同一 discipline 最多 2 个
  for (const item of scoredVideos) {
    if (picked.length >= limit) break;

    const v = item.v;
    const vidId = String(v.id);
    if (usedIds.has(vidId)) continue;

    const disc = v.discipline || 'UNKNOWN';
    const count = disciplineCount.get(disc) || 0;
    if (count >= 2) continue;

    const rec: RecItem = {
      id: v.id,
      title: v.title,
      whyThis: buildWhyForVideo(v, user, careerIds, careerMap),
      confidence: item.score >= 4 ? 'high' : item.score >= 2 ? 'medium' : 'low',
    };

    picked.push(rec);
    usedIds.add(vidId);
    disciplineCount.set(disc, count + 1);
  }

  // 第二轮兜底：不限制 discipline，补足到 limit
  if (picked.length < limit) {
    for (const item of scoredVideos) {
      if (picked.length >= limit) break;

      const v = item.v;
      const vidId = String(v.id);
      if (usedIds.has(vidId)) continue;

      const rec: RecItem = {
        id: v.id,
        title: v.title,
        whyThis: buildWhyForVideo(v, user, careerIds, careerMap),
        confidence: item.score >= 4 ? 'high' : item.score >= 2 ? 'medium' : 'low',
      };

      picked.push(rec);
      usedIds.add(vidId);
    }
  }

  return picked;
}

// ========== 8. 一次性加载静态数据 ==========
export const MOCK_USERS: UserProfile[] = loadUsersFromJson(mockUsersRaw as any);
const GAMES: Unit[] = loadGamesAsUnitsFromJson(gamesRaw as any);
const CAREERS: Career[] = loadCareersFromJson(careersRaw as any);
const VIDEOS: Video[] = loadVideosFromJson(videosRaw as any);

// ========== 9. 主推荐函数 ==========
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

  // --- careers ---（利用年级 + 兴趣 + 抖动，且至少尝试补满 TOPK 个）
  let careersTop: CareerRecItem[] = [];
  if (!(isColdStart(user) && HIDE_CAREERS_ON_COLDSTART)) {
    const scored = CAREERS.map((c) => {
      const s = scoreCareer(c, user);
      const baseScore = s.score;

      const iBoost = interestBoostForCareer(user, c);
      const gBoost = gradeBoostForCareer(user, c);

      let finalScore = baseScore + iBoost + gBoost;

      const jitterRaw = Math.abs(
        hashStringToInt(`${user.id}:${c.id}`),
      ) % 1000;
      const jitter = (jitterRaw / 1000) * 0.03; // 0 ~ 0.03
      finalScore += jitter;

      if (finalScore < 0) finalScore = 0;

      return {
        career: c,
        scored: s,
        baseScore,
        interestBoost: iBoost,
        gradeBoost: gBoost,
        finalScore,
      };
    });

    const positive = scored.filter((item) => item.scored.score > 0);
    const effective =
      positive.length >= TOPK
        ? positive
        : scored;

    // 先按 finalScore 排序
    effective.sort((a, b) => {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      const ha = hashStringToInt(`${user.id}:${a.career.id}`);
      const hb = hashStringToInt(`${user.id}:${b.career.id}`);
      return ha - hb;
    });

    const picked: CareerRecItem[] = [];
    const usedDisciplines = new Set<string>();

    // 第一轮：尽量保证 discipline 多样性（同一学科先拿 1 个）
    for (const item of effective) {
      if (picked.length >= TOPK) break;

      const c = item.career;
      const s = item.scored;
      const disc = c.discipline || 'UNKNOWN';

      if (!usedDisciplines.has(disc)) {
        picked.push({
          id: c.id,
          title: c.title,
          whyThis: buildWhyForCareer(user, c, s),
          confidence: confidenceFromScore(item.finalScore),
          evidence: [
            `baseScore=${item.baseScore.toFixed(2)}`,
            `interestBoost=${item.interestBoost.toFixed(2)}`,
            `gradeBoost=${item.gradeBoost.toFixed(2)}`,
            `finalScore=${item.finalScore.toFixed(2)}`,
            `covered=${s.covered.toFixed(2)}`,
            `required_threshold=${c.threshold ?? 0} (relaxed to 40%)`,
          ],
        });
        usedDisciplines.add(disc);
      }
    }

    // 第二轮兜底：如果 discipline 种类少于 TOPK，再从高分里补满到 TOPK，不再限制学科
    if (picked.length < TOPK) {
      for (const item of effective) {
        if (picked.length >= TOPK) break;

        const already = picked.some((p) => p.id === item.career.id);
        if (already) continue;

        const c = item.career;
        const s = item.scored;

        picked.push({
          id: c.id,
          title: c.title,
          whyThis: buildWhyForCareer(user, c, s),
          confidence: confidenceFromScore(item.finalScore),
          evidence: [
            `baseScore=${item.baseScore.toFixed(2)}`,
            `interestBoost=${item.interestBoost.toFixed(2)}`,
            `gradeBoost=${item.gradeBoost.toFixed(2)}`,
            `finalScore=${item.finalScore.toFixed(2)}`,
            `covered=${s.covered.toFixed(2)}`,
            `required_threshold=${c.threshold ?? 0} (relaxed to 40%)`,
          ],
        });
      }
    }

    careersTop = picked;
  }

  // --- videos ---（每个用户 5 个）
  const videosOut = selectVideosForUser(user, VIDEOS, careersTop, 5);

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
