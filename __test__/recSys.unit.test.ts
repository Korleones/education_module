// src/rec-system/recSys.unit.test.ts
// Unit tests for the recommendation engine: validate recSys core rule logic with fully controlled mock data.

import type { UserProfile } from './recSys';

// 1. Mock the four JSON files so that recSys.ts uses our small test dataset during tests
jest.mock('../../assets/data/mock_users_progress.json', () => ({
  __esModule: true,
  default: {
    users: [
      {
        user_id: 'Y3_U1',
        year: 3,
        skills_levels: {
          QP: 1,
          PC: 1,
          PAD: 0,
          EVAL: 0,
          COMM: 1,
        },
        knowledge_progress: [{ node: 'BIO.Y3.AC9S3U01', level: 1 }],
        career_interests: ['biology', 'doctor'],
      },
    ],
  },
}));

jest.mock('../../assets/data/curriculum_games.json', () => ({
  __esModule: true,
  default: {
    games: [
      {
        id: 'g1',
        title: 'Intro to Cells',
        difficulty: 'easy', // -> difficulty level 1
        progress_effects: {
          knowledge: {
            node: 'BIO.Y3.AC9S3U01',
          },
        },
      },
      {
        id: 'g2',
        title: 'Planet Explorer',
        difficulty: 'core', // -> difficulty level 2
        progress_effects: {
          knowledge: {
            node: 'EARTH.Y3.AC9S3U02',
          },
        },
      },
      {
        id: 'g3',
        title: 'Hard Physics Challenge',
        difficulty: 'challenging', // -> difficulty level 3
        progress_effects: {
          knowledge: {
            node: 'PHYS.Y6.AC9S6U01',
          },
        },
      },
    ],
  },
}));

jest.mock('../../assets/data/STEM Careers.json', () => ({
  __esModule: true,
  default: {
    careers: [
      {
        id: 'c1',
        title: 'Biologist',
        discipline: 'Biological Sciences',
        min_skill_levels: {
          QP: 1,
        },
        required_knowledge: [
          {
            node: 'BIO.Y3.AC9S3U01',
            min_level: 1,
            weight: 1.0,
          },
        ],
        threshold: 1,
      },
      {
        id: 'c2',
        title: 'Astronomer',
        discipline: 'Earth & Space Sciences',
        min_skill_levels: {
          QP: 2, // user does not meet this skill requirement → gate should fail
        },
        required_knowledge: [
          {
            node: 'EARTH.Y3.AC9S3U02',
            min_level: 1,
            weight: 1.0,
          },
        ],
        threshold: 1,
      },
    ],
  },
}));

jest.mock('../../assets/data/discipline_videos.json', () => ({
  __esModule: true,
  default: {
    videos: [
      {
        id: 'v1',
        title: 'Meet a Biologist',
        discipline: 'Biological Sciences',
        career_id: 'c1',
        video_url: 'https://example.com/biologist',
      },
      {
        id: 'v2',
        title: 'Explore Space',
        discipline: 'Earth & Space Sciences',
        career_id: 'c2',
        video_url: 'https://example.com/astronomer',
      },
    ],
  },
}));

// 2. Import recSys.ts after mocking so it uses the mocked JSON data above
import {
  getRecommendationsForProfile,
  getRecommendationsForUserId,
  MOCK_USERS,
} from './recSys';

describe('recSys rule-based engine (unit/module tests)', () => {
  it('loads mock users correctly', () => {
    expect(MOCK_USERS.length).toBe(1);
    expect(MOCK_USERS[0].id).toBe('Y3_U1');
    expect(MOCK_USERS[0].grade).toBe(3);
  });

  it('getRecommendationsForUserId returns structured result', () => {
    const result = getRecommendationsForUserId('Y3_U1');

    expect(result.user.id).toBe('Y3_U1');
    expect(result.user.isColdStart).toBe(false);
    expect(result.recommendations.units).toBeInstanceOf(Array);
    expect(result.recommendations.careers).toBeInstanceOf(Array);
    expect(result.recommendations.videos).toBeInstanceOf(Array);
    expect(typeof result.meta.generatedAt).toBe('string');
  });

  it('recommends next-level / new-units for non-cold-start user', () => {
    const result = getRecommendationsForUserId('Y3_U1');

    const units = result.recommendations.units;
    const careers = result.recommendations.careers;

    expect(units.length).toBeGreaterThan(0);
    expect(careers.length).toBeGreaterThan(0);

    const unitTitles = units.map((u) => u.title);

    // Because ONLY_NEXT_LEVEL_UNITS = true, Intro to Cells (same level as current) should not be recommended again
    expect(unitTitles).not.toContain('Intro to Cells');

    // For new knowledge nodes, Planet Explorer / Hard Physics Challenge should be recommended
    expect(unitTitles).toContain('Planet Explorer');
    expect(unitTitles).toContain('Hard Physics Challenge');
  });

  it('recommends Biologist as a suitable career with explanation and evidence', () => {
    const result = getRecommendationsForUserId('Y3_U1');
    const careers = result.recommendations.careers;

    const biologist = careers.find((c) => c.id === 'c1');
    expect(biologist).toBeTruthy();
    expect(biologist!.whyThis.length).toBeGreaterThan(0);
    expect(biologist!.evidence.some((e) => e.startsWith('baseScore='))).toBe(
      true,
    );
    expect(
      biologist!.evidence.some((e) => e.startsWith('interestBoost=')),
    ).toBe(true);
  });

  it('may show Astronomer as a future pathway with relaxed rules', () => {
    const result = getRecommendationsForUserId('Y3_U1');
    const careers = result.recommendations.careers;

    const astro = careers.find((c) => c.id === 'c2');
    if (astro) {
      expect(astro.whyThis).toMatch(/relaxed the rules/i);
    }
  });

  it('recommends at least one video and links to careers or disciplines', () => {
    const result = getRecommendationsForUserId('Y3_U1');
    const videos = result.recommendations.videos;

    expect(videos.length).toBeGreaterThan(0);
    const titles = videos.map((v) => v.title);
    expect(titles).toContain('Meet a Biologist');

    const firstWhy = videos[0].whyThis;
    expect(typeof firstWhy).toBe('string');
    expect(firstWhy.length).toBeGreaterThan(0);
  });

  it('treats a user with no knowledge and skills as cold-start', () => {
    const coldUser: UserProfile = {
      id: 'cold-1',
      grade: 4,
      knowledge: {},
      inquiry_skills: {},
      career_interests: [],
    };

    const result = getRecommendationsForProfile(coldUser);
    expect(result.user.isColdStart).toBe(true);
    expect(result.recommendations.units.length).toBeGreaterThan(0);
    expect(result.recommendations.videos.length).toBeGreaterThan(0);
  });
});
