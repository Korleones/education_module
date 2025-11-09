
# JSON Schema Documentation for Skills/Knowledge & Careers

## 1. Skills & Knowledge JSON (`skills_knowledge.json`)

### Top-level Keys
- **`schema`** *(object)* — metadata about structure.  
- **`data`** *(array)* — the main content, one object per **year**.

---

### Inside `data[]`

#### Variables

- **`year`** *(number)*  
  School year (3–10).

- **`discipline_nodes`** *(array of objects)*  
  Knowledge outcomes for that year and discipline.  
  Each has:
  - **`discipline`** *(string)* — one of: `"Biological Sciences" | "Chemical Sciences" | "Earth & Space Sciences" | "Physical Sciences"`.
  - **`code`** *(string)* — curriculum code (e.g., `"AC9S3U01"`).
  - **`levels`** *(array of objects)* — subdivides the knowledge into 3 levels within the year.  
    - **`level`** *(integer, 1–3)* — relative difficulty / progression within the year.  
    - **`description`** *(string)* — what students can do at that level.

- **`skills`** *(array of objects)*  
  Science Inquiry Skills for that year. These only **level up between years**, not within.  
  Each has:
  - **`strand`** *(string)* — `"Questioning & Predicting" | "Planning & Conducting" | "Processing & Analysing Data" | "Evaluating" | "Communicating"`.  
  - **`level`** *(integer, 1–8)* — skill progression across years (Y3=1 … Y10=8).  
  - **`description`** *(string)* — what mastery looks like at this year’s level.

---

### Node ID Conventions
- **Knowledge node**: `{DISCIPLINE}.Y{year}.{code}`  
  e.g., `PHYSICAL.Y9.AC9S9U03`.  
- **Skill node**: `INQ.Y{year}.{ABBR}`  
  e.g., `INQ.Y7.PAD` (`PAD = Processing & Analysing Data`).

---

## 2. Careers JSON (`careers_only.json`)

### Top-level Keys
- **`meta`** *(object)* — references back to the skills/knowledge model.  
- **`careers`** *(array)* — each career pathway definition.

---

### Inside `careers[]`

#### Variables

- **`id`** *(string)*  
  Machine-readable unique ID (e.g., `career.marine_biologist`).

- **`title`** *(string)*  
  Display name (e.g., `"Marine Biologist"`).

- **`category`** *(string)*  
  Broad cluster (e.g., `"Health"`, `"Trades"`, `"Data/IT"`, `"Environment"`).

- **`min_skill_levels`** *(object)*  
  Minimum levels required for **Science Inquiry Skills**.  
  Keys map to abbreviations:  
  - `"QP"` = Questioning & Predicting  
  - `"PC"` = Planning & Conducting  
  - `"PAD"` = Processing & Analysing Data  
  - `"EVAL"` = Evaluating  
  - `"COMM"` = Communicating  
  Example:  
  ```json
  { "QP": 5, "PC": 6, "PAD": 6, "EVAL": 6, "COMM": 5 }
  ```

- **`required_knowledge`** *(array of objects)*  
  Specific knowledge nodes that matter for this career.  
  Each has:
  - **`node`** *(string)* — ID referencing skills_knowledge.json (e.g., `BIO.Y9.AC9S9U01`).  
  - **`min_level`** *(integer, 1–3)* — minimum within-year mastery needed.  
  - **`weight`** *(number, 0.0–1.0)* — relative importance of this knowledge node to the career.

- **`logic`** *(string)*  
  Rule for combining skills + knowledge. Currently `"AND"` (both must be satisfied).  

- **`threshold`** *(number, e.g. 1.5)*  
  The minimum **sum of weights** a student must achieve (from required knowledge nodes) to count as “meeting knowledge requirements.”

---

### Linking Between Files
- **Careers JSON references Skills/Knowledge JSON**:
  - `required_knowledge[].node` must exist in `skills_knowledge.json`.  
  - `min_skill_levels` values map to strand `level` numbers in `skills_knowledge.json`.  

This means:  
- Students’ progress is tracked in **skills_knowledge.json**.  
- Careers check progress by comparing requirements in **careers_only.json**.
