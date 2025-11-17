// src/rec-system/generate_user_recs.ts
// 批量为所有 mock 用户生成推荐结果，保存为单独的 json 文件

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

  console.log(`准备为 ${users.length} 个用户生成推荐结果...`);
  users.forEach((u, idx) => {
    const rec: RecResult = getRecommendationsForUserId(u.id);
    const fileName = toFileName(u.id);
    const filePath = path.join(OUT_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(rec, null, 2), 'utf8');
    console.log(`[${idx + 1}/${users.length}] 写入: ${filePath}`);
  });

  console.log('✅ 全部完成!');
}

main();
