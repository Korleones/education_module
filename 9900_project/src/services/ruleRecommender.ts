import { SkillsRepo } from '../repo/skillsRepo';
import { UsersRepo } from '../repo/usersRepo';
import { CareersRepo } from '../repo/careersRepo';
import type {
  RecommendationItem, UserProgress, Career, CareerRequiredNode, StrandAbbr
} from '../types/models';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));

function userHasNodeAtLevel(user: UserProgress, nodeId: string, min: number) {
  const rec = user.knowledge_progress.find(k => k.node === nodeId);
  return rec ? rec.level >= min : false;
}

function careerKnowledgeScore(user: UserProgress, career: Career) {
  let sum = 0;
  for (const req of career.required_knowledge) {
    const nid = CareersRepo.normalizeNodeId(req.node);
    sum += userHasNodeAtLevel(user, nid, req.min_level) ? req.weight : 0;
  }
  return sum;
}

function meetsMinSkills(user: UserProgress, career: Career) {
  const u = user.skills_levels, m = career.min_skill_levels;
  return (u.QP >= m.QP && u.PC >= m.PC && u.PAD >= m.PAD && u.EVAL >= m.EVAL && u.COMM >= m.COMM);
}

export function getRuleNextSteps(userId: string, completedNodeId: string) {
  const user = UsersRepo.get(userId); if (!user) return [];
  const items: RecommendationItem[] = [];

  // A. 知识推进：progression_to
  for (const n of SkillsRepo.getNextProgression(completedNodeId)) {
    items.push({
      id: n.id, kind: 'knowledge', title: n.title,
      reason: `Progression from ${completedNodeId} → ${n.id}`,
      confidence: 0.85, payload: { type: 'progression' }
    });
  }

  // B. 相似补全：similar_to（若未达标）
  for (const n of SkillsRepo.getSimilar(completedNodeId)) {
    const learned = user.knowledge_progress.find(k => k.node === n.id)?.level ?? 0;
    if (learned < 2) {
      items.push({
        id: n.id, kind: 'knowledge', title: n.title,
        reason: `Similar to ${completedNodeId}, current level=${learned}`,
        confidence: 0.7, payload: { type: 'similar', currentLevel: learned }
      });
    }
  }

  // C. 强化 Inquiry 技能：reinforced_by
  for (const r of SkillsRepo.getReinforcedBy(completedNodeId)) {
    const abbr = r.split('.').pop() as StrandAbbr; // e.g., "PAD"
    const cur = user.skills_levels[abbr];
    items.push({
      id: r, kind: 'skill_strand', title: `Improve ${abbr}`,
      reason: `This node reinforces ${abbr}. Your current ${abbr}=${cur}`,
      confidence: clamp(0.6 + (cur < 4 ? 0.15 : 0)),
      payload: { strand: abbr, current: cur }
    });
  }

  // D. 职业差距：针对兴趣职业给出缺口最大的必修节点
  const interests = user.career_interests ?? [];
  for (const c of CareersRepo.list().filter(x => interests.includes(x.id))) {
    const skillOK = meetsMinSkills(user, c);
    const kscore = careerKnowledgeScore(user, c);
    const meet = (kscore >= c.threshold) && skillOK;
    if (!meet) {
      const lacks: CareerRequiredNode[] = c.required_knowledge
        .filter(req => !userHasNodeAtLevel(user, CareersRepo.normalizeNodeId(req.node), req.min_level))
        .sort((a, b) => b.weight - a.weight);

      if (lacks.length) {
        const top = lacks[0];
        const nid = CareersRepo.normalizeNodeId(top.node);
        const kn = SkillsRepo.getNode(nid);
        items.push({
          id: nid, kind: 'career_gap', title: kn?.title ?? nid,
          reason: `For ${c.title}: missing ${nid} (min L${top.min_level}, w=${top.weight})`,
          confidence: clamp(0.5 + top.weight * 0.5),
          payload: { career: c.id, threshold: c.threshold, kscore, skillOK, missing: lacks }
        });
      }
    }
  }

  // 去重+排序
  const seen = new Set<string>(), out: RecommendationItem[] = [];
  for (const it of items) if (!seen.has(it.id)) { seen.add(it.id); out.push(it); }
  return out.sort((a, b) => b.confidence - a.confidence);
}
