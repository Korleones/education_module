import Raw from '../../../../assets/data/mock_users_progress.json';
import type { UserProgress } from '../types/models';

// 这里假设结构为 { "users": [...] }
const root = Raw as { users: UserProgress[] };
const users: UserProgress[] = root.users ?? [];
const map = new Map(users.map(u => [u.user_id, u]));

export const UsersRepo = {
  get(userId: string): UserProgress | undefined { return map.get(userId); },
  list(): UserProgress[] { return users; }
};
