
# JSON Schema Definitions (Skills, Careers, Games, Videos)

This document defines the structures and linking rules for four JSON files used by the app.

---

## 1) `skills_knowledge.json`

### Purpose
Defines curriculum **knowledge** nodes (by discipline and year) and **Science Inquiry Skills** (year-level progression). Knowledge has **three within-year levels**; skills level **between years only**.

### Top-Level
- **`meta`** *(object, required)*
  - `version` *(string, required)*
  - `model` *(string, required)*
  - `years` *(array<number>, required)* — Supported years (e.g., `[3,4,...,10]`).
  - `discipline_list` *(array<string>, required)* — Allowed values: `"Biological Sciences"`, `"Chemical Sciences"`, `"Earth & Space Sciences"`, `"Physical Sciences"`.
  - `skill_strands` *(array<string>, required)* — Allowed values: `"Questioning & Predicting"`, `"Planning & Conducting"`, `"Processing & Analysing Data"`, `"Evaluating"`, `"Communicating"`.
  - `skill_level_mapping` *(object, required)* — Maps `Y{year}` → integer level (Y3=1 … Y10=8).

- **`disciplines`** *(array<object>, required)* — Knowledge nodes. Each item:
  - `id` *(string, required)* — Format: `{DISCIPLINE}.Y{year}.{code}`; discipline prefix is one of `BIO`, `CHEMICAL`, `EARTH`, `PHYSICAL`.
  - `year` *(number, required)* — 3..10.
  - `discipline` *(string, required)* — One of the values in `meta.discipline_list`.
  - `code` *(string, required)* — e.g., `AC9S7U03`.
  - `title` *(string, required)*
  - `description` *(string, required)*
  - `levels` *(array<object>, required; length=3)* — Within-year knowledge ladder. Each:
    - `level` *(integer, required; 1..3)*
    - `outcomes` *(array<string>, required; non-empty)*
  - `progression_to` *(string|null, optional)* — Next-year node ID in same discipline or `null`.
  - `similar_to` *(array<string>, optional)* — Related node IDs (any discipline/year).
  - `reinforced_by` *(array<string>, optional)* — Skill node IDs (same year).

- **`skills_progression`** *(array<object>, required)* — Year-level skills by strand. Each item:
  - `strand` *(string, required)* — One of the values in `meta.skill_strands`.
  - `levels_by_year` *(array<object>, required; one entry per year)* — Each:
    - `year` *(number, required)* — 3..10.
    - `level` *(integer, required; 1..8)* — Determined by `meta.skill_level_mapping`.
    - `outcomes` *(array<string>, required; non-empty)*

- **`skills_nodes`** *(array<object>, optional)* — Convenience list. Each:
  - `id` *(string, required)* — Format: `INQ.Y{year}.{ABBR}` where `ABBR ∈ {QP, PC, PAD, EVAL, COMM}`.
  - `strand` *(string, required)*
  - `year` *(number, required)* — 3..10.
  - `level` *(integer, required; 1..8)*
  - `outcomes` *(array<string>, required; non-empty)*

### IDs & Constraints
- **Knowledge ID**: `{DISC}.Y{year}.{code}`; `{DISC} ∈ {BIO, CHEMICAL, EARTH, PHYSICAL}`.
- **Skill ID**: `INQ.Y{year}.{ABBR}`; `{ABBR} ∈ {QP, PC, PAD, EVAL, COMM}`.
- Knowledge `levels.level` ∈ {1,2,3}. Skill `level` ∈ {1..8}.

### Relationships
- `disciplines[].reinforced_by` → `skills_nodes[].id` (same `year`).
- `disciplines[].progression_to` → another `disciplines[].id` (next `year`, same discipline).

---

## 2) `careers.json`

### Purpose
Career catalogue that **references** the skills/knowledge model without duplicating it.

### Top-Level
- **`meta`** *(object, required)*
  - `version` *(string, required)*
  - `notes` *(string, optional)*
  - `references` *(object, required)*
    - `skills_knowledge_model_file` *(string, required)* — Filename of the skills/knowledge JSON to resolve node/skill IDs.
    - `skill_strands` *(object, required)* — Mapping abbreviations to full names: `{ "QP": "Questioning & Predicting", "PC": "Planning & Conducting", "PAD": "Processing & Analysing Data", "EVAL": "Evaluating", "COMM": "Communicating" }`.
    - `node_id_format` *(string, required)* — e.g., `{DISC}.Y{year}.{code}`.
    - `skill_node_id_format` *(string, required)* — e.g., `INQ.Y{year}.{ABBR}`.

- **`careers`** *(array<object>, required)* — Each career entry:
  - `id` *(string, required)* — Unique career ID.
  - `title` *(string, required)*
  - `category` *(string, required)* — Arbitrary grouping label (e.g., clusters).
  - `min_skill_levels` *(object, required)* — Required minimum per strand on **1..8** scale. Keys MUST be subset of `{QP, PC, PAD, EVAL, COMM}`; values are integers `1..8`.
  - `required_knowledge` *(array<object>, required)* — Knowledge prerequisites. Each:
    - `node` *(string, required)* — Must match a `disciplines[].id` in `skills_knowledge.json`.
    - `min_level` *(integer, required; 1..3)* — Within-year knowledge level.
    - `weight` *(number, required; 0.0..1.0)* — Relative importance in progress calculation.
  - `logic` *(string, required)* — Rule for gating (e.g., `AND(min_skill_levels, sum(weighted(required_knowledge)) >= threshold)`).
  - `threshold` *(number, required)* — Minimum sum of `weight` across satisfied knowledge items.

### Relationships
- `careers[].required_knowledge[].node` → `skills_knowledge.disciplines[].id`.
- `careers[].min_skill_levels[*]` → compare to `skills_knowledge.skills_nodes.level` for the same strand/year-derived scale (1..8).

---

## 3) `curriculum_games.json`

### Purpose
One **game** per curriculum knowledge node (Y3–Y10). Completing a game **increases skill levels** (STRANDS: QP/PC/PAD/EVAL/COMM) and **knowledge node level** for the associated node.

### Top-Level
- **`games`** *(array<object>, required)* — Each game:
  - `id` *(string, required)* — Unique game ID (e.g., `game.001`).
  - `title` *(string, required)*
  - `year` *(number, required)* — 3..10.
  - `discipline` *(string, required)* — One of: `"Biological Sciences"`, `"Chemical Sciences"`, `"Earth & Space Sciences"`, `"Physical Sciences"`.
  - `code` *(string, required)* — Curriculum code, e.g., `AC9S9U03`.
  - `node_id` *(string, required)* — Knowledge node ID the game maps to. Format: `{DISC}.Y{year}.{code}`; must exist in `skills_knowledge.disciplines[].id`.
  - `estimated_duration_sec` *(number, required)* — Estimated play time in seconds.
  - `difficulty` *(string, required)* — Suggested values: `"Beginner" | "Core" | "Challenge"`.
  - `core_mechanics` *(array<string>, required; non-empty)*
  - `progress_effects` *(object, required)* — How completion updates progress:
    - `skills` *(array<object>, required; length ≥ 1)* — Each:
      - `strand` *(string, required)* — One of `{QP, PC, PAD, EVAL, COMM}`.
      - `level_increment` *(integer, required; ≥1)* — Additive change to the student’s current strand level.
      - `cap` *(integer, required; 1..8)* — Upper bound after increment.
    - `knowledge` *(object, required)*
      - `node` *(string, required)* — Must equal `node_id`.
      - `level_increment` *(integer, required; ≥1)* — Additive change to the student’s node level.
      - `cap` *(integer, required; 1..3)* — Upper bound after increment.

### Update Semantics
- Skill update: `new_skill_level = min(cap, current_level + level_increment)`.
- Knowledge update: `new_node_level = min(cap, current_node_level + level_increment)`.

### Relationships
- `games[].node_id` → `skills_knowledge.disciplines[].id`.
- `progress_effects.skills[*].strand` aligns with `careers.min_skill_levels` strand keys.

---

## 4) `discipline_videos.json`

### Purpose
Short videos of scientists/engineers, each tagged to a **discipline** and associated with a **career** from `careers.json`.

### Top-Level
- **`videos`** *(array<object>, required)* — Each video entry:
  - `id` *(string, required)* — Unique video ID (e.g., `video.001`).
  - `title` *(string, required)* — Recommended format: `"{career_title}_{discipline}_video"`.
  - `discipline` *(string, required)* — One of: `"Biological Sciences"`, `"Chemical Sciences"`, `"Earth & Space Sciences"`, `"Physical Sciences"`.
  - `career_id` *(string, required)* — Must match `careers[].id` in `careers.json`.
  - `career_title` *(string, required)* — Display name aligned with `career_id`.
  - `duration_sec` *(number, required)* — Duration in seconds.
  - `topic_style` *(string, required)* — Suggested values: `"Intro" | "Student Story" | "Day-in-the-life" | "Deep Dive"`.
  - `video_url` *(string, required)* — Playback URL (can be placeholder).
  - `thumbnail_url` *(string, required)*
  - `tags` *(array<string>, optional)* — Free-form tags; recommended to include `[discipline, career.category, career.title]`.

### Relationships
- `videos[].career_id` → `careers.json.careers[].id`.
- `videos[].discipline` should correspond to the discipline of knowledge nodes connected to the linked career (used for UX filtering; not enforced by schema).

---

## Global Linking Notes

- All file paths and IDs must be **consistent** across files:
  - Careers reference **skills/knowledge node IDs** and strand keys.
  - Games reference **skills/knowledge node IDs** and use strand keys for skill increments.
  - Videos reference **career IDs** and share the same discipline vocabulary.

- **Validation recommendations** (for CI/tests):
  - Verify every `careers.required_knowledge[].node` exists in `skills_knowledge.disciplines[].id`.
  - Verify every `games.node_id` exists in `skills_knowledge.disciplines[].id`.
  - Verify every `progress_effects.skills[*].strand` ∈ `{QP, PC, PAD, EVAL, COMM}` and caps are within `1..8`.
  - Verify every `progress_effects.knowledge.cap` ∈ `1..3`.
  - Verify every `videos.career_id` exists in `careers.careers[].id`.
