// src/rec-system/recSys.e2e.test.ts
// Engine-level e2e test: use real JSON data and run the full recommendation flow starting from a userId.

import { getRecommendationsForUserId, MOCK_USERS } from '../src/rec-system/recSys';

describe('recSys engine e2e (with real JSON data)', () => {
  it('MOCK_USERS should not be empty', () => {
    expect(Array.isArray(MOCK_USERS)).toBe(true);
    expect(MOCK_USERS.length).toBeGreaterThan(0);
  });

  it('generates recommendations for a real mock user id', () => {
    const userId = MOCK_USERS[0].id;
    const result = getRecommendationsForUserId(userId);

    // User information
    expect(result.user.id).toBe(userId);
    expect(result.user.knowledge).toBeDefined();
    expect(result.user.inquiry_skills).toBeDefined();

    const { units, careers, videos } = result.recommendations;
    expect(Array.isArray(units)).toBe(true);
    expect(Array.isArray(careers)).toBe(true);
    expect(Array.isArray(videos)).toBe(true);

    const totalCount = units.length + careers.length + videos.length;
    expect(totalCount).toBeGreaterThan(0);

    if (careers.length > 0) {
      const c = careers[0];
      expect(typeof c.whyThis).toBe('string');
      expect(c.whyThis.length).toBeGreaterThan(0);
      expect(Array.isArray(c.evidence)).toBe(true);
    }

    if (units.length > 0) {
      const u = units[0];
      expect(typeof u.whyThis).toBe('string');
      expect(u.whyThis.length).toBeGreaterThan(0);
    }

    expect(typeof result.meta.generatedAt).toBe('string');
    expect(result.meta.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});
