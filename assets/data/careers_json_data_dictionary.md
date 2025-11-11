# Careers JSON — Data Dictionary & Usage Guide

This document explains the structure and intent of the **careers JSON** generated from your `Discipline, Career, Description` CSV. It also describes how it links to the **V9 Skills & Knowledge** nodes so students can see a pathway from school skills to careers (and vice versa).

> File referenced: `careers_with_skills_knowledge_288.json`

---

## 1) Top-level Structure

```jsonc
{
  "careers": [ CareerObject, ... ]
}
```

Each item in `careers` describes one career, the disciplines it spans, the skills and knowledge students need to build, and graph edges connecting the career to related careers.

---

## 2) CareerObject Schema

```jsonc
{
  "id": "string",                      // Stable ID for the career node
  "title": "string",                   // Career title (as in CSV)
  "discipline": ["string", ...],       // Primary + any inferred secondary disciplines
  "category": "string",                // Role family (e.g., Engineer, Scientist, Technician)
  "description": "string",
  "connections": [ Connection, ... ],  // Graph edges to other careers
  "required_skills_knowledge": [ RSK, ... ], // Per-discipline skills/knowledge mapping
  "progression_path": [ PathItem, ... ]      // Optional UX hints for the app
}
```

### 2.1 `id`
- **Type:** `string`
- **Format:** `career:{primary-discipline-slug}-{career-title-slug}` (lowercase, non-alphanumeric → `-`)
- **Use:** Unique key for the node, referenced by `connections.target_career_id`.

### 2.2 `title`
- **Type:** `string`
- **Source:** CSV `Career` column.
- **Use:** Display name.

### 2.3 `discipline`
- **Type:** `array<string>`
- **Allowed values:**  
  - `Biological Sciences`  
  - `Chemical Sciences`  
  - `Earth & Space Sciences`  
  - `Physical Sciences`
- **Rules:**
  - First item is **primary** discipline (from CSV `Discipline`).
  - Additional items may be **inferred** from the title/description (e.g., “Biomedical Engineer” → `Biological Sciences` + `Physical Sciences`).

### 2.4 `category`
- **Type:** `string`
- **Purpose:** A high-level role family for consistent UX and skills weighting.
- **Typical values:**
  - `Engineer`, `Scientist`, `Technician`, `Analyst`, `Designer`,
  `Manager/Coordinator`, `Operator/Assistant`,
  `Communications/Media`, `Policy/Legal/Economics`, `Professional`
- **Inference:** Derived from keywords in the title (e.g., “Engineer”, “Technician”, “Scientist”).

### 2.5 `description`
- **Type:** `string`
- **Source:** CSV `Description` column.
- **Use:** Tooltip / detail view text.

### 2.6 `connections`
Represents edges in the **career constellation**. Used to draw the network and power recommendations (“adjacent careers”, “people also explore…”).

```jsonc
{
  "target_career_id": "career:...",
  "weights": {
    "shared_knowledge": 0.0,  // 0..1 — topical overlap (keywords)
    "skill_similarity": 0.0,  // 0..1 — title/desc token similarity
    "category": 0.0           // 0.05 inter-discipline, 0.15 intra-discipline (bridge bias)
  },
  "total_weight": 0.0         // Weighted sum used for ranking edges
}
```

- **`shared_knowledge`** — A heuristic score for overlapping domain keywords (e.g., optics + sensors).  
- **`skill_similarity`** — Jaccard similarity based on tokenised title/description (proxy for similarity of tasks).  
- **`category`** — Small bias that prefers **intra-discipline** links but still allows **inter-discipline** bridges.  
- **`total_weight`** — Combined edge strength used for layout and recommendations.

> **Tip:** To avoid isolated nodes, we ensure each career has both **intra-** and **inter-discipline** neighbors (k-NN + degree floor).

### 2.7 `required_skills_knowledge`
Per **discipline** mapping of skills and curriculum **V9 knowledge nodes** students can build towards this career.

```jsonc
{
  "discipline": "Biological Sciences",
  "skills": [
    "Questioning & Predicting",
    "Planning & Conducting",
    "Processing & Analysing Data",
    "Evaluating",
    "Communicating"
  ],
  "knowledge_nodes": ["AC9S9U01","AC9S10U01","AC9S8U01"]
}
```

- **`discipline`** — One of the four V9 disciplines (see 2.3).  
- **`skills`** — Strand-level skills aligned to role **category**:  
  - `Scientist` → primary: **Questioning & Predicting**; secondary includes **Processing & Analysing Data**, **Evaluating**, **Communicating**.  
  - `Engineer` → primary: **Planning & Conducting**; secondary includes **Evaluating**, **Communicating**, **Processing & Analysing Data**.  
  - `Technician/Operator` → **Planning & Conducting** + **Processing & Analysing Data**.  
  - Others map similarly (see mapping in code).
- **`knowledge_nodes`** — Curriculum codes (V9) chosen per discipline and category:  
  - Scientist/Engineer/Analyst bias towards **upper years** (`AC9S9*`, `AC9S10*`) + one mid-year node.  
  - Technician/Operator bias towards **mid years** (`AC9S8*`, `AC9S9*`).  
  - Others get a balanced mix.  
- **Multi-discipline careers** get **one `RSK` entry per discipline**, so progress can be tracked separately for each area.

### 2.8 `progression_path`
Optional UX scaffold for your app (can be populated by your recommender).

```jsonc
{
  "year_range": "Year 7–10",
  "recommended_games": [],      // inject IDs from curriculum_games.json
  "recommended_videos": []      // inject IDs from videos JSON
}
```

---

## 3) How the Constellation Works

- Each career node is connected to **K≈8** nearest neighbors by similarity of title/description + domain-keyword overlap, with a small bias for intra-discipline edges.  
- To ensure **discoverability**, we guarantee:
  - at least **one intra-discipline** neighbor;
  - at least **one inter-discipline** bridge (if available).
- The resulting graph supports:
  - “Explore related careers”
  - “Bridge to adjacent disciplines”
  - Curriculum-aligned progression (“what skills/knowledge am I missing?”)

---

## 4) How the V9 Skills & Knowledge Are Used

- The careers JSON references V9 codes by discipline:  
  - Biological: `AC9S7U01`, `AC9S8U01`, `AC9S9U01`, `AC9S10U01`  
  - Earth & Space: `AC9S7U02`, `AC9S8U02`, `AC9S9U02`, `AC9S10U02`  
  - Physical: `AC9S7U03`, `AC9S8U03`, `AC9S9U03`, `AC9S10U03`  
  - Chemical: `AC9S7U04`, `AC9S8U04`, `AC9S9U04`, `AC9S10U04`
- In the app, student progress can increment these codes and the five **Science Inquiry Skills** strands:
  - `Questioning & Predicting`
  - `Planning & Conducting`
  - `Processing & Analysing Data`
  - `Evaluating`
  - `Communicating`

> **Progress logic suggestion:** Treat each `(discipline, knowledge_node)` and `skill` as a trackable objective. A career becomes **“reachable”** when its `required_skills_knowledge` entries meet threshold levels (e.g., 0.7 mastery).

---

## 5) IDs & Cross-file References

- The careers JSON uses `id = "career:<slug>"`.  
- Your **curriculum games** and **videos** JSON should use stable IDs and list which `knowledge_nodes` and `skills` they affect so the app can auto-suggest progressions and update mastery.

---

## 6) Validation Hints

- **Uniqueness:** `id` must be unique across all careers.  
- **Disciplines:** must be one or more of the four canonical values. First entry must match the CSV primary `Discipline`.  
- **Connections:** `target_career_id` must exist in this file.  
- **RSK:** every career must have ≥1 `required_skills_knowledge` entry; multi-discipline roles should have one per discipline.

---

## 7) Example (truncated)

```jsonc
{
  "id": "career:physical-sciences-optical-engineer",
  "title": "Optical Engineer",
  "discipline": ["Physical Sciences", "Biological Sciences"],
  "category": "Engineer",
  "description": "Develops spectrometers and HUD systems for aerospace and biomedical applications.",
  "connections": [
    {
      "target_career_id": "career:physical-sciences-avionics-technician",
      "weights": { "shared_knowledge": 0.6, "skill_similarity": 0.4, "category": 0.15 },
      "total_weight": 0.55
    }
  ],
  "required_skills_knowledge": [
    {
      "discipline": "Physical Sciences",
      "skills": ["Planning & Conducting","Evaluating","Communicating","Processing & Analysing Data"],
      "knowledge_nodes": ["AC9S9U03","AC9S10U03","AC9S8U03"]
    },
    {
      "discipline": "Biological Sciences",
      "skills": ["Planning & Conducting","Evaluating","Communicating","Processing & Analysing Data"],
      "knowledge_nodes": ["AC9S9U01","AC9S10U01","AC9S8U01"]
    }
  ],
  "progression_path": [ { "year_range":"Year 7–10","recommended_games":[],"recommended_videos":[] } ]
}
```

---

## 8) Versioning & Rebuilds

- If the CSV changes (new titles or disciplines), re-run the pipeline to refresh:
  - IDs (stable if titles & primary discipline unchanged)
  - Connections (graph will update)
  - Knowledge nodes (auto-selected mix per discipline + category)

---

## 9) FAQ

**Q: Why do some careers have multiple disciplines?**  
A: Titles/descriptions can imply cross-domain work (e.g., “Biomedical…”, “Environmental…”, “Aerospace Materials…”). These become bridges in the constellation and receive knowledge nodes from *all* listed disciplines.

**Q: How are weights used?**  
A: In graph layout, recommendations, and to order “related careers”. You can threshold `total_weight` for UI density.

**Q: Can we pin or manually edit connections?**  
A: Yes—your app can override or add curated edges. Keep the structure but alter `connections` for specific nodes.

---

*Last updated: generated alongside `careers_with_skills_knowledge_288.json`.*
