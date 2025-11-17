// src/rec-system/generate_user_recs.ts
// 批量为所有 mock 用户“更新”推荐结果，只修改已经存在的 json 文件（不再新建）

import * as fs from 'fs';
import * as path from 'path';
import {
  MOCK_USERS,
  getRecommendationsForUserId,
  type RecResult,
} from './recSys';

// 输出目录：项目根 -> assets/data/output/user_recs
const OUT_DIR = path.resolve(__dirname, '../../assets/data/output/user_recs');

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
}

// 把用户 id 变成安全的文件名
function toFileName(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `rec_${safe}.json`;
}

function main() {
  ensureOutDir();

  // 这里 MOCK_USERS 就是 mock_users_progress.json 里的 40 个用户
  const users = MOCK_USERS.slice(0, 40);

  console.log(`准备为 ${users.length} 个用户更新推荐结果（只修改已有 json）...`);
  users.forEach((u, idx) => {
    const rec: RecResult = getRecommendationsForUserId(u.id);
    const fileName = toFileName(u.id);
    const filePath = path.join(OUT_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(
        `[${idx + 1}/${users.length}] 跳过：${filePath} 不存在（不新建文件）`,
      );
      return;
    }

    // 读取原来的文件，只更新 recommendations 和 meta.generatedAt
    const oldRaw = fs.readFileSync(filePath, 'utf8');
    let oldJson: any;
    try {
      oldJson = JSON.parse(oldRaw);
    } catch (e) {
      console.warn(
        `[${idx + 1}/${users.length}] 警告：${filePath} 解析失败，直接覆盖为新结构`,
      );
      fs.writeFileSync(filePath, JSON.stringify(rec, null, 2), 'utf8');
      return;
    }

    const updated = {
      ...oldJson,
      recommendations: rec.recommendations,
      meta: {
        ...(oldJson.meta || {}),
        generatedAt: rec.meta.generatedAt,
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
    console.log(`[${idx + 1}/${users.length}] 已更新: ${filePath}`);
  });

  console.log('✅ 全部更新完成!');
}

main();
