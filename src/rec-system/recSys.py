# src/rec-system/recSys.py

import json, re
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Tuple, Set

# 0. Path settings (adjust to your project structure)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR     = PROJECT_ROOT / "assets" / "data"

P_USERS     = DATA_DIR / "mock_users_progress.json"
P_GAMES     = DATA_DIR / "curriculum_games.json"
P_CAREERS_1 = DATA_DIR / "careers_with_skills_knowledge_263.json"
P_CAREERS_2 = DATA_DIR / "STEM Careers.json"
P_VIDEOS    = DATA_DIR / "discipline_videos.json"
P_KN_MODEL  = DATA_DIR / "Skills and Knowledge years 3-10.json"  


# 1. Global config
TOPK                      = 3   # Originally 5, now 3: only take top 3 units and careers
ONLY_NEXT_LEVEL_UNITS     = True
HIDE_CAREERS_ON_COLDSTART = False
MAX_DIFFICULTY            = 3


# 2. Small utilities
def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def parse_difficulty(raw) -> int:
    if isinstance(raw, (int, float)):
        try:
            return int(raw)
        except Exception:
            return 1
    s = str(raw).strip().lower()
    if s in ("beginner", "easy", "low"):
        return 1
    if s in ("core", "medium", "moderate", "normal"):
        return 2
    if s in ("challenge", "challenging", "hard", "difficult"):
        return 3
    return 1


def subject_label_from_node(node_id: str) -> str:
    if not node_id:
        return "this topic"
    up = node_id.upper()
    if up.startswith("BIO"):
        return "Biological Sciences"
    if up.startswith("CHEM"):
        return "Chemical Sciences"
    if up.startswith("PHYS") or up.startswith("PHYSICAL"):
        return "Physical Sciences"
    if up.startswith("EARTH"):
        return "Earth & Space Sciences"
    return "Science"


def parse_year_from_node(node_id: str) -> str:
    if not node_id:
        return ""
    for p in node_id.split("."):
        if p.startswith("Y"):
            return p
    return ""


def confidence_from_score(score: float) -> str:
    if score >= 0.75:
        return "high"
    elif score >= 0.4:
        return "medium"
    else:
        return "low"


# 3. Load users
def load_users() -> List[Dict[str, Any]]:
    raw = load_json(P_USERS)
    arr = raw["users"] if isinstance(raw, dict) and "users" in raw else raw
    users: List[Dict[str, Any]] = []
    for i, u in enumerate(arr):
        uid = u.get("user_id") or u.get("id") or f"user-{i+1:03d}"
        grade = u.get("year", u.get("grade", 0))

        inq_src = u.get("skills_levels") or u.get("inquiry_skills") or {}
        inquiry_skills = {k: int(v) for k, v in inq_src.items()}

        kn_src = u.get("knowledge_progress") or u.get("knowledge") or []
        knowledge: Dict[str, int] = {}
        if isinstance(kn_src, list):
            for item in kn_src:
                node = item.get("node")
                lvl = item.get("level", 0)
                if node:
                    knowledge[node] = int(lvl)
        elif isinstance(kn_src, dict):
            knowledge = {k: int(v) for k, v in kn_src.items()}

        users.append({
            "id": uid,
            "grade": int(grade) if str(grade).isdigit() else grade,
            "inquiry_skills": inquiry_skills,
            "knowledge": knowledge,
            "career_interests": u.get("career_interests", []),
        })
    return users



# 4. Load curriculum/games: curriculum_games.json
def load_games_as_units() -> List[Dict[str, Any]]:
    raw = load_json(P_GAMES)
    games = raw["games"] if isinstance(raw, dict) and "games" in raw else raw
    units: List[Dict[str, Any]] = []
    for g in games:
        pe = g.get("progress_effects") or {}
        pe_kn = pe.get("knowledge") or {}
        node_id = pe_kn.get("node") or g.get("node_id") or g.get("code")
        knowledge_nodes = []
        if node_id:
            knowledge_nodes.append({"id": node_id, "weight": 1.0})
        units.append({
            "id": g.get("id"),
            "title": g.get("title", g.get("id")),
            "kind": "game",
            "difficulty": parse_difficulty(g.get("difficulty", 1)),
            "knowledge_nodes": knowledge_nodes,
            "progress_effects": g.get("progress_effects", {}),
        })
    return units


# 5. Load videos: discipline_videos.json (kept separate from units, recommended independently)
def load_videos() -> List[Dict[str, Any]]:
    raw = load_json(P_VIDEOS)
    if isinstance(raw, dict) and "videos" in raw:
        arr = raw["videos"]
    else:
        arr = raw if isinstance(raw, list) else []
    videos: List[Dict[str, Any]] = []
    for idx, v in enumerate(arr, start=1):
        if isinstance(v, dict):
            videos.append({
                "id": v.get("id") or f"video-{idx}",
                "title": v.get("title", f"Scientist video {idx}"),
                "discipline": v.get("discipline"),
                "career_id": v.get("career_id"),
                "video_url": v.get("video_url"),
            })
        else:
            videos.append({
                "id": f"video-{idx}",
                "title": str(v),
                "discipline": None,
                "career_id": None,
                "video_url": None,
            })
    return videos


# 6. Load careers: now only use STEM Careers.json
def load_careers() -> List[Dict[str, Any]]:
    """
    We now read career information solely from STEM Careers.json,
    and no longer use careers_with_skills_knowledge_263.json.
    To stay compatible with the score_career logic, we still try
    to read min_skill_levels / required_knowledge / threshold / discipline
    from STEM Careers.json; if any are missing, default values are used.
    """
    raw = load_json(P_CAREERS_2)  # Only use STEM Careers.json
    arr = raw["careers"] if isinstance(raw, dict) and "careers" in raw else raw

    careers: List[Dict[str, Any]] = []
    for c in arr:
        careers.append({
            "id": c.get("id") or c.get("career_id"),
            "title": c.get("title") or c.get("name"),
            "min_skill_levels": c.get("min_skill_levels", {}),
            "required_knowledge": c.get("required_knowledge", []),
            "threshold": c.get("threshold", 0),
            "discipline": c.get("discipline"),
        })
    return careers


# 7. User helpers & unit selection
def is_cold_start(user: Dict[str, Any]) -> bool:
    return (sum(user.get("knowledge", {}).values()) == 0) and (sum(user.get("inquiry_skills", {}).values()) == 0)


def filter_units(units_in: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for u in units_in:
        diff = parse_difficulty(u.get("difficulty", 1))
        if MAX_DIFFICULTY and diff > MAX_DIFFICULTY:
            continue
        out.append(u)
    return out


def pick_next_level_units(units_in: List[Dict[str, Any]], user: Dict[str, Any]) -> List[Dict[str, Any]]:
    have = user.get("knowledge", {}) or {}
    best: Dict[str, Tuple[int, Dict[str, Any]]] = {}
    for u in units_in:
        kns = u.get("knowledge_nodes") or []
        if not kns:
            continue
        node = kns[0]["id"]
        cur_lv = int(have.get(node, 0))
        unit_lv = parse_difficulty(u.get("difficulty", 1))
        if unit_lv <= cur_lv:
            continue
        prev = best.get(node)

        def rank(x): return (x == cur_lv + 1, -x)

        if prev is None or rank(unit_lv) > rank(prev[0]):
            best[node] = (unit_lv, u)
    return [u for _, u in best.values()]


# 8. Scoring & whyThis
def score_unit(unit: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    raw = 0.0
    for kn in unit.get("knowledge_nodes", []):
        node_id = kn["id"]
        w = float(kn.get("weight", 1.0))
        have = int(user.get("knowledge", {}).get(node_id, 0))
        gap = 1.0 if have == 0 else 0.6
        raw += w * gap
    if parse_difficulty(unit.get("difficulty", 1)) == 3:
        raw *= 0.95
    return {"raw": raw, "signals": [kn["id"] for kn in unit.get("knowledge_nodes", [])]}


def build_why_for_unit(user: Dict[str, Any], signals: List[str]) -> str:
    user_kn = user.get("knowledge", {}) or {}
    if signals:
        node = signals[0]
        subject = subject_label_from_node(node)
        year = parse_year_from_node(node)
        has_same = any(subject_label_from_node(k) == subject for k in user_kn.keys())
        if has_same:
            return f"You’ve already learned some {subject}, so this {year or ''} activity is the next step to extend it.".strip()
        else:
            return f"This activity introduces {subject} at a level that suits you."
    return "This activity is a good next step for your science learning."


def score_career(career: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    user_kn = user.get("knowledge", {}) or {}
    user_sk = user.get("inquiry_skills", {}) or {}

    min_sk = career.get("min_skill_levels", {}) or {}
    unmet_skills = [(k, v) for k, v in min_sk.items() if int(user_sk.get(k, 0)) < int(v)]
    gate_pass = len(unmet_skills) == 0

    req_kn = career.get("required_knowledge", []) or []
    covered = 0.0
    total_w = 0.0
    unmet_nodes = []
    for rk in req_kn:
        node = rk.get("node")
        if not node:
            continue
        need = int(rk.get("min_level", 1))
        w = float(rk.get("weight", 1.0))
        total_w += w
        have = int(user_kn.get(node, 0))
        if have >= need:
            covered += w
        else:
            unmet_nodes.append({"node": node, "need": need, "have": have, "w": w})

    threshold = float(career.get("threshold", 0))
    threshold_pass = (covered >= threshold * 0.4) if threshold > 0 else True

    base = (covered / total_w) if total_w > 0 else 0.0
    if gate_pass and threshold_pass:
        score = base
    elif threshold_pass and not gate_pass:
        score = max(0.4, base * 0.6)
    else:
        score = base * 0.6
    if score == 0:
        score = 0.45

    return {
        "score": score,
        "gate_pass": gate_pass,
        "threshold_pass": threshold_pass,
        "unmet_skills": unmet_skills,
        "unmet_nodes": sorted(unmet_nodes, key=lambda x: -x["w"]),
        "covered": covered,
        "total_w": total_w,
    }


def build_why_for_career(user: Dict[str, Any], career: Dict[str, Any], scored: Dict[str, Any]) -> str:
    parts = ["This career is connected to the science areas you’ve been learning."]
    nice_skill_names = {
        "QP": "questioning & predicting",
        "PC": "planning & conducting",
        "PAD": "processing & analysing data",
        "EVAL": "evaluating",
        "COMM": "communicating",
    }
    if not scored["gate_pass"] and scored["unmet_skills"]:
        missing = [nice_skill_names.get(sk, sk) for sk, _ in scored["unmet_skills"][:2]]
        parts.append("You still need inquiry skills like " + ", ".join(missing) + ".")
    if not scored["threshold_pass"] and scored["unmet_nodes"]:
        top = scored["unmet_nodes"][0]
        parts.append(f"You also need a bit more on {subject_label_from_node(top['node'])}.")
    parts.append("We relaxed the rules to show this career to you now.")
    return " ".join(parts)


# 9. Video matching (key changes)
def select_videos_for_user(
    user: Dict[str, Any],
    videos: List[Dict[str, Any]],
    picked_careers: List[Dict[str, Any]],
    limit: int = 2,
) -> List[Dict[str, Any]]:
    """
    Without changing your video files, pick using two signals:
    1) Student’s subjects → BIO / CHEM / PHYS / EARTH mapped to the video 'discipline' field
    2) IDs of the recommended careers → matched against the video's 'career_id'
    Career match is prioritised, subject match is secondary.
    """
    # 1. Disciplines the student has learned
    user_disciplines: Set[str] = set()
    for node in (user.get("knowledge") or {}).keys():
        user_disciplines.add(subject_label_from_node(node))

    # 2. IDs of recommended careers
    career_ids: Set[str] = set()
    for c in picked_careers:
        if c.get("id"):
            career_ids.add(c["id"])

    picked: List[Dict[str, Any]] = []

    # First, match by career_id exactly
    for v in videos:
        if len(picked) >= limit:
            break
        if v.get("career_id") and v["career_id"] in career_ids:
            picked.append({
                "id": v["id"],
                "title": v["title"],
                "whyThis": "This video is about the career we just recommended to you.",
                "confidence": "high",
            })

    # Then, match by discipline
    for v in videos:
        if len(picked) >= limit:
            break
        vd = v.get("discipline")
        if vd and vd in user_disciplines:
            picked.append({
                "id": v["id"],
                "title": v["title"],
                "whyThis": f"This video is related to the {vd} you are learning.",
                "confidence": "medium",
            })

    return picked


# 10. Main recommendation function
def get_recommendations_for_user(
    user: Dict[str, Any],
    units_games: List[Dict[str, Any]],
    careers: List[Dict[str, Any]],
    videos: List[Dict[str, Any]],
) -> Dict[str, Any]:

    # --- units ---
    filtered_units = filter_units(units_games)
    if ONLY_NEXT_LEVEL_UNITS:
        next_level_units = pick_next_level_units(filtered_units, user)
    else:
        next_level_units = filtered_units
    if next_level_units:
        units_for_scoring = next_level_units
    else:
        units_for_scoring = filtered_units

    unit_scored = [{"u": u, **score_unit(u, user)} for u in units_for_scoring]
    max_raw = max([x["raw"] for x in unit_scored], default=1e-6)
    unit_scored.sort(key=lambda x: -x["raw"])

    units_out: List[Dict[str, Any]] = []
    for x in unit_scored[:TOPK]:
        u = x["u"]
        score_norm = x["raw"] / max_raw
        units_out.append({
            "id": u["id"],
            "title": u.get("title", u["id"]),
            "whyThis": build_why_for_unit(user, x["signals"]),
            "confidence": confidence_from_score(score_norm),
        })

    # --- careers ---
    careers_out: List[Dict[str, Any]] = []
    if not (is_cold_start(user) and HIDE_CAREERS_ON_COLDSTART):
        for c in careers:
            s = score_career(c, user)
            careers_out.append({
                "id": c["id"],
                "title": c.get("title", c["id"]),
                "whyThis": build_why_for_career(user, c, s),
                "confidence": confidence_from_score(s["score"]),
                "evidence": [
                    f"covered={s['covered']:.2f}",
                    f"required_threshold={c.get('threshold', 0)} (relaxed to 40%)",
                ],
            })
        careers_out = sorted(careers_out, key=lambda x: x["confidence"], reverse=True)[:TOPK]

    # --- videos (new matching logic) ---
    videos_out = select_videos_for_user(user, videos, careers_out, limit=2)

    return {
        "user": {
            "id": user["id"],
            "grade": user.get("grade"),
            "isColdStart": is_cold_start(user),
            "knowledge": user.get("knowledge"),
            "inquiry_skills": user.get("inquiry_skills"),
        },
        "recommendations": {
            "units": units_out,
            "videos": videos_out,
            "careers": careers_out,
        },
        "meta": {
            "generatedAt": datetime.now().astimezone().isoformat()
        }
    }


# 11. Entry point
if __name__ == "__main__":
    users   = load_users()
    games   = load_games_as_units()
    careers = load_careers()
    videos  = load_videos()

    print("total users:", len(users))
    print("sample user ids:", [u["id"] for u in users][:10])

    target_id = users[0]["id"]   # test user
    user = next(u for u in users if u["id"] == target_id)

    result = get_recommendations_for_user(user, games, careers, videos)

    print("\n================ USER ================")
    print(json.dumps(result["user"], indent=2, ensure_ascii=False))

    print("\n================ UNITS ================")
    print(json.dumps(result["recommendations"]["units"], indent=2, ensure_ascii=False))

    print("\n================ VIDEOS ================")
    print(json.dumps(result["recommendations"]["videos"], indent=2, ensure_ascii=False))

    print("\n================ CAREERS ================")
    print(json.dumps(result["recommendations"]["careers"], indent=2, ensure_ascii=False))
