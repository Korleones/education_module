# 🚀 Arludo STEM Learning & Career Exploration Platform

## A Comprehensive System for Curated Science Progression and Career Guidance

This document outlines the core modules of the Arludo STEM Learning and Career Exploration Platform, built using **React Native (Expo)** and **TypeScript**. The platform transforms abstract career goals into **concrete, personalized, and actionable learning pathways** aligned with the Australian Curriculum v9 (AC9).

---

## 📋 Table of Contents

* [1. Project Setup & Installation](#1-project-setup--installation)
* [2. Core Modules](#2-core-modules)
    * [2.1 🌳 Skill Tree System (Knowledge Visualization)](#21--skill-tree-system-knowledge-visualization)
    * [2.2 🎯 Trajectory Panel (Career Pathway Tracker)](#22--trajectory-panel-career-pathway-tracker)
    * [2.3 🧩 Recommendation System (Rule-Based Engine)](#23--recommendation-system-rule-based-engine)
* [3. Technical Stack & Data](#3-technical-stack--data)
* [4. Usage Flow](#4-usage-flow)
* [5. Project Data Files](#5-project-data-files)


---

## 1. Project Setup & Installation

These instructions will get a copy of the project up and running on your local machine using Docker for development and testing.

### 1.1 Project Code Retrieval

You have two options for obtaining the project files:

* **Option 1: Using the Zip File**
    If you have the project's zip file, please unzip it into a folder on your local machine.

* **Option 2: Cloning from GitHub**
    ```bash
    # If you prefer to clone directly:
    # git clone [[https://github.com/unsw-cse-comp99-3900/capstone-project-25t3-9900-w18g-almond.git](https://github.com/unsw-cse-comp99-3900/capstone-project-25t3-9900-w18g-almond.git)]
    
    # Or simply download the files from the main branch:
    # [[https://github.com/unsw-cse-comp99-3900/capstone-project-25t3-9900-w18g-almond/tree/main](https://github.com/unsw-cse-comp99-3900/capstone-project-25t3-9900-w18g-almond/tree/main)]
    ```

### 1.2 Docker Installation

This project relies on **Docker** for containerization. Install **Docker Desktop** for your OS.

### 1.3 Running the Program

1.  **Change Directory:** Navigate your terminal to the project's **root directory** (the folder containing `docker-compose.yml`).
2.  **Execute the command** to build and run the containers in detached mode (`-d`):
    ```bash
    docker compose up -d
    # Build and run the containers in the background (detached mode)
    ```
3.  **Access the Application:** Open your web browser and visit:
    $$\text{http://localhost:8081}$$
    > **Note:** If port `8081` is in use, modify the host port in `docker-compose.yml` (e.g., `"8081:8081"`).

---

## 2. Core Modules

### 2.1 🌳 Skill Tree System (Knowledge Visualization)

This module renders an interactive, **SVG-based visualization** of the Australian Curriculum v9 Science disciplines (Year 3 to Year 10).

* **Node Representation:** Each node displays its **Discipline (BIO, CHEM, EARTH, PHYS)**, **Year Level (Y3–Y10)**, and current **Completion Level (Lv.1–3)**.
* **Color-Coded Status:** Visualizes the student's learning readiness:
    * **🔒 Grey:** **Locked** (Prerequisites not met or skills insufficient).
    * **✓ Blue:** **Available** (Ready to start).
    * **⏳ Orange:** **In Progress** (Level 1 or 2 completed).
    * **⭐ Green:** **Earned** (All three levels completed).
* **Status Logic:** Node status is **automatically calculated** by checking **Knowledge Progress** (Level 1-3), **Progression Relationships** (prerequisite must be Earned/Level 3), **User Skill Levels**, and **Reinforced Skills** requirements.

### 2.2 🎯 Trajectory Panel (Career Pathway Tracker)

This module acts as the **Focused Development** stage, providing a personalized, scrollable learning pathway based on a chosen career.

* **Automated Gap Analysis:** Compares student skill/knowledge levels with career requirements to identify missing or incomplete items.
* **Structured Pathway:** Renders a structured view of **Missing Skills**, **Missing Knowledge Units (AC9 Curriculum)**, and **Recommended Games & Videos**.
* **Visualization:** Uses progress bars and level indicators (e.g., “Current 2 / Target 8”) to track progress visually.

### 2.3 🧩 Recommendation System (Rule-Based Engine)

This module generates and explains personalized recommendations for **Units/Games**, **STEM Careers**, and **Videos**.

* **Unit Filtering:** Recommends the **"next level"** units for each curriculum node (difficulty is exactly `current Level + 1`), supporting a scaffolding approach.
* **Career Scoring:** Scores careers based on **Skill Gate** (minimum inquiry skills) and **Knowledge Coverage**, using a **relaxed threshold** (40% rule) to show careers as learning goals early.
* **Explainability:** Every recommendation includes a **`whyThis`** natural-language explanation built from the scoring signals, ensuring transparency.
* **Debug Mode:** A toggleable **Debug Mode** displays the raw JSON scoring data for teacher review and development.

---

## 3. Technical Stack & Data

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Framework** | **React Native (Expo)** | Cross-platform mobile development. |
| **Language** | **TypeScript** | Enhances code quality and type safety. |
| **Visualization** | **React Native SVG** | Used for efficient Skill Tree rendering. |
| **Routing** | **Expo Router** | Manages routing and navigation. |

---

## 4. Usage Flow

1.  **Enter Skill Tree:** Tap the **“🌳 Skill Tree”** button on the app homepage.
2.  **View & Update Progress:** Tap a node to open the detail modal and manually update its **Status** and/or **Level (1–3)**, which triggers an automatic recalculation.
3.  **View Trajectory:** Select a career and click **“View Pathway”** to open the **Trajectory Panel**.
4.  **Review Recommendations:** Navigate to the **Recommendation System** page to see tailored **Units**, **Videos**, and **Careers**.

---

## 5. Project Data Files

The system relies on the following local JSON data sources:

* `Skills and Knowledge years 3–10.json` (Curriculum Structure)
* `mock_users_progress.json` (Student Progress: `skills_levels` & `knowledge_progress`)
* `careers_with_recs.json` (Career Definitions & Requirements)
* `curriculum_games.json` (Learning Units/Games)
* `discipline_videos.json` (Scientist Videos)

---




## 📝 Project Testing Strategy: Manual Verification as Primary, Automated Tests as Auxiliary

Given that the core functionalities of this project—the **Skill Tree Status Calculation** and the **Recommendation System Algorithm**—are built upon complex **educational rules and business logic**, our primary quality assurance strategy relies on **manual testing and verification**.

### 1. 🔍 Manual Verification (Primary QA)

We use manual, targeted testing to validate the accuracy of complex algorithms, educational integrity, and the overall user experience.

* **Skill Tree Status Validation:**
    * **Manually modify** the user's skill levels (`skills_levels`) and knowledge progress (`knowledge_progress`) via the `NodeDetailModal`.
    * **Verify in real-time** that the system correctly performs the automatic recalculation and updates node statuses (`Locked`, `Available`, `In Progress`, `Earned`) according to the `Status Calculation Logic`.
    * Validate that the locking logic based on **`Progression Relationships`** (prerequisite node must be Lv.3) and **`Reinforced Skills`** (required inquiry skill levels) works as intended.

* **Trajectory Panel Verification (Gap Analysis):**
    * Manually select a career and verify that the **`Automated Gap Analysis`** result accurately reflects the gap between the student's current level and the career's requirements.

* **Recommendation System Validation (Rule Validation):**
    * Use **Debug Mode** to inspect the raw scores and signals within `CareerRecItem.evidence`.
    * Verify that the `scoreCareer` and `scoreUnit` logic (e.g., **`Threshold with relaxation`**, **`Interest boost`**, and **`Grade boost`**) operates according to the defined rules.
    * Confirm that the natural language **`whyThis`** explanation for recommendations aligns with the underlying rules and signals.

### 2. 🧪 Automated Testing (Auxiliary QA)

Jest/TypeScript test files serve as an auxiliary tool, primarily focused on rapid regression testing for key pure functions and UI components.

* **Unit Tests (`recSys.unit.test.ts`):**
    * Ensure that the core algorithmic pure functions (e.g., `scoreCareer`, `pickNextLevelUnits`) return expected scores and statuses for specific data inputs.
    * Guarantee that the **core calculation parts** of complex business rules (e.g., Next-Level Selection, Skill Gate Check) are reliable.

* **End-to-End/Integration Tests (`recSys.e2e.test.ts`, `skillTree.e2e.js`):**
    * Used to verify that critical user flows (e.g., navigation from the homepage to the skill tree, or clicking a node to open the `NodeDetailModal`) do not crash.
    * Perform rendering and basic interaction tests on important UI components (e.g., `RecommendationCard.test.jsx`, `SkillTreeVisualizer.tsx`).

---

**Conclusion:** Manual testing is essential for verifying the **"educational validity"** and **"user experience,"** while automated testing provides fast, reliable assurance for **"algorithmic computational correctness."** The two strategies are mutually supportive.
