// app/(tabs)/navigation/rec-system/repo/userRecsRepo.ts
import type { RecommendationItem } from '../types/models';

// ===== 40 个学生 JSON 全量导入 =====
// 路径按你确认的为准：../../../../../assets/data/output/user_recs/rec_Y*_U*.json

// Y3
import rec_Y3_U1 from '../../../../../assets/data/output/user_recs/rec_Y3_U1.json';
import rec_Y3_U2 from '../../../../../assets/data/output/user_recs/rec_Y3_U2.json';
import rec_Y3_U3 from '../../../../../assets/data/output/user_recs/rec_Y3_U3.json';
import rec_Y3_U4 from '../../../../../assets/data/output/user_recs/rec_Y3_U4.json';
import rec_Y3_U5 from '../../../../../assets/data/output/user_recs/rec_Y3_U5.json';

// Y4
import rec_Y4_U1 from '../../../../../assets/data/output/user_recs/rec_Y4_U1.json';
import rec_Y4_U2 from '../../../../../assets/data/output/user_recs/rec_Y4_U2.json';
import rec_Y4_U3 from '../../../../../assets/data/output/user_recs/rec_Y4_U3.json';
import rec_Y4_U4 from '../../../../../assets/data/output/user_recs/rec_Y4_U4.json';
import rec_Y4_U5 from '../../../../../assets/data/output/user_recs/rec_Y4_U5.json';

// Y5
import rec_Y5_U1 from '../../../../../assets/data/output/user_recs/rec_Y5_U1.json';
import rec_Y5_U2 from '../../../../../assets/data/output/user_recs/rec_Y5_U2.json';
import rec_Y5_U3 from '../../../../../assets/data/output/user_recs/rec_Y5_U3.json';
import rec_Y5_U4 from '../../../../../assets/data/output/user_recs/rec_Y5_U4.json';
import rec_Y5_U5 from '../../../../../assets/data/output/user_recs/rec_Y5_U5.json';

// Y6
import rec_Y6_U1 from '../../../../../assets/data/output/user_recs/rec_Y6_U1.json';
import rec_Y6_U2 from '../../../../../assets/data/output/user_recs/rec_Y6_U2.json';
import rec_Y6_U3 from '../../../../../assets/data/output/user_recs/rec_Y6_U3.json';
import rec_Y6_U4 from '../../../../../assets/data/output/user_recs/rec_Y6_U4.json';
import rec_Y6_U5 from '../../../../../assets/data/output/user_recs/rec_Y6_U5.json';

// Y7
import rec_Y7_U1 from '../../../../../assets/data/output/user_recs/rec_Y7_U1.json';
import rec_Y7_U2 from '../../../../../assets/data/output/user_recs/rec_Y7_U2.json';
import rec_Y7_U3 from '../../../../../assets/data/output/user_recs/rec_Y7_U3.json';
import rec_Y7_U4 from '../../../../../assets/data/output/user_recs/rec_Y7_U4.json';
import rec_Y7_U5 from '../../../../../assets/data/output/user_recs/rec_Y7_U5.json';

// Y8
import rec_Y8_U1 from '../../../../../assets/data/output/user_recs/rec_Y8_U1.json';
import rec_Y8_U2 from '../../../../../assets/data/output/user_recs/rec_Y8_U2.json';
import rec_Y8_U3 from '../../../../../assets/data/output/user_recs/rec_Y8_U3.json';
import rec_Y8_U4 from '../../../../../assets/data/output/user_recs/rec_Y8_U4.json';
import rec_Y8_U5 from '../../../../../assets/data/output/user_recs/rec_Y8_U5.json';

// Y9
import rec_Y9_U1 from '../../../../../assets/data/output/user_recs/rec_Y9_U1.json';
import rec_Y9_U2 from '../../../../../assets/data/output/user_recs/rec_Y9_U2.json';
import rec_Y9_U3 from '../../../../../assets/data/output/user_recs/rec_Y9_U3.json';
import rec_Y9_U4 from '../../../../../assets/data/output/user_recs/rec_Y9_U4.json';
import rec_Y9_U5 from '../../../../../assets/data/output/user_recs/rec_Y9_U5.json';

// Y10
import rec_Y10_U1 from '../../../../../assets/data/output/user_recs/rec_Y10_U1.json';
import rec_Y10_U2 from '../../../../../assets/data/output/user_recs/rec_Y10_U2.json';
import rec_Y10_U3 from '../../../../../assets/data/output/user_recs/rec_Y10_U3.json';
import rec_Y10_U4 from '../../../../../assets/data/output/user_recs/rec_Y10_U4.json';
import rec_Y10_U5 from '../../../../../assets/data/output/user_recs/rec_Y10_U5.json';

// ===== userId -> 原始 JSON 映射表 =====

const RAW_MAP: Record<string, any> = {
  // Y3
  Y3_U1: rec_Y3_U1,
  Y3_U2: rec_Y3_U2,
  Y3_U3: rec_Y3_U3,
  Y3_U4: rec_Y3_U4,
  Y3_U5: rec_Y3_U5,

  // Y4
  Y4_U1: rec_Y4_U1,
  Y4_U2: rec_Y4_U2,
  Y4_U3: rec_Y4_U3,
  Y4_U4: rec_Y4_U4,
  Y4_U5: rec_Y4_U5,

  // Y5
  Y5_U1: rec_Y5_U1,
  Y5_U2: rec_Y5_U2,
  Y5_U3: rec_Y5_U3,
  Y5_U4: rec_Y5_U4,
  Y5_U5: rec_Y5_U5,

  // Y6
  Y6_U1: rec_Y6_U1,
  Y6_U2: rec_Y6_U2,
  Y6_U3: rec_Y6_U3,
  Y6_U4: rec_Y6_U4,
  Y6_U5: rec_Y6_U5,

  // Y7
  Y7_U1: rec_Y7_U1,
  Y7_U2: rec_Y7_U2,
  Y7_U3: rec_Y7_U3,
  Y7_U4: rec_Y7_U4,
  Y7_U5: rec_Y7_U5,

  // Y8
  Y8_U1: rec_Y8_U1,
  Y8_U2: rec_Y8_U2,
  Y8_U3: rec_Y8_U3,
  Y8_U4: rec_Y8_U4,
  Y8_U5: rec_Y8_U5,

  // Y9
  Y9_U1: rec_Y9_U1,
  Y9_U2: rec_Y9_U2,
  Y9_U3: rec_Y9_U3,
  Y9_U4: rec_Y9_U4,
  Y9_U5: rec_Y9_U5,

  // Y10
  Y10_U1: rec_Y10_U1,
  Y10_U2: rec_Y10_U2,
  Y10_U3: rec_Y10_U3,
  Y10_U4: rec_Y10_U4,
  Y10_U5: rec_Y10_U5,
};

// 置信度字符串 -> 数值
function confidenceToScore(conf: string | undefined): number {
  switch (conf) {
    case 'high':
      return 0.9;
    case 'medium':
      return 0.7;
    case 'low':
      return 0.5;
    default:
      return 0.6;
  }
}

/**
 * 从文件推荐结果映射成统一的 RecommendationItem[]
 * 若该 userId 没有文件，则返回 []
 */
export function getUserFileNextSteps(userId: string): RecommendationItem[] {
  const raw = RAW_MAP[userId];
  if (!raw || !raw.recommendations) return [];

  const rec = raw.recommendations;
  const items: RecommendationItem[] = [];

  // units
  if (Array.isArray(rec.units)) {
    for (const u of rec.units) {
      items.push({
        id: u.id,
        kind: 'unit',
        title: u.title,
        reason: u.whyThis,
        confidence: confidenceToScore(u.confidence),
        payload: { source: 'file', category: 'unit' },
      });
    }
  }

  // videos
  if (Array.isArray(rec.videos)) {
    for (const v of rec.videos) {
      items.push({
        id: v.id,
        kind: 'video',
        title: v.title,
        reason: v.whyThis,
        confidence: confidenceToScore(v.confidence),
        payload: { source: 'file', category: 'video' },
      });
    }
  }

  // careers
  if (Array.isArray(rec.careers)) {
    for (const c of rec.careers) {
      items.push({
        id: c.id,
        kind: 'career',
        title: c.title,
        reason: c.whyThis,
        confidence: confidenceToScore(c.confidence),
        payload: {
          source: 'file',
          category: 'career',
          evidence: c.evidence ?? [],
        },
      });
    }
  }

  return items;
}

export function getUserRawRecs(userId: string): any | null {
  return RAW_MAP[userId] ?? null;
}