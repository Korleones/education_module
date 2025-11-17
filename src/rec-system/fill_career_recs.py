import json
from collections import defaultdict
from pathlib import Path

# ========== 0. 路径配置：根据你截图的结构 ==========
# 当前文件在：   9900PROJECT/src/rec-system/fill_career_recs.py
ROOT = Path(__file__).resolve().parent           # .../src/rec-system
PROJECT_ROOT = ROOT.parent.parent                # .../   (9900PROJECT)
DATA_DIR = PROJECT_ROOT / "assets" / "data"      # .../assets/data

CAREERS_PATH = DATA_DIR / "careers_with_skills_knowledge_263.json"
GAMES_PATH   = DATA_DIR / "curriculum_games.json"
VIDEOS_PATH  = DATA_DIR / "discipline_videos.json"

# 输出到 assets/data/output 里（你已经有这个文件夹）
OUTPUT_PATH  = DATA_DIR / "output" / "careers_with_recs.json"

MAX_GAMES_PER_CAREER  = 3
MAX_VIDEOS_PER_CAREER = 3


# ========== 1. 读取 JSON ==========
def load_json(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"找不到文件: {path}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


careers_data = load_json(CAREERS_PATH)
games_raw    = load_json(GAMES_PATH)
videos_raw   = load_json(VIDEOS_PATH)

careers = careers_data.get("careers", [])

# games 兼容两种结构：数组 或 { "games": [...] }
if isinstance(games_raw, list):
    games = games_raw
else:
    games = games_raw.get("games", [])

# videos 兼容两种结构：数组 或 { "videos": [...] }
if isinstance(videos_raw, list):
    videos = videos_raw
else:
    videos = videos_raw.get("videos", [])


# ========== 2. 工具函数 ==========
def extract_game_id(g: dict) -> str | None:
    gid = g.get("id") or g.get("game_id") or g.get("code")
    return str(gid) if gid is not None else None


def extract_game_node(g: dict) -> str | None:
    """
    模仿你 recSys.ts 里的逻辑：
      const pe = g.progress_effects || {};
      const peKn = pe.knowledge || {};
      const nodeId = peKn.node || g.node_id || g.code;
    """
    pe = g.get("progress_effects") or {}
    pe_kn = pe.get("knowledge") or {}

    node = None
    if isinstance(pe_kn, dict):
        node = pe_kn.get("node")

    node = node or g.get("node_id") or g.get("code")
    return str(node) if node is not None else None


def extract_game_discipline(g: dict) -> str | None:
    # 如果 game 里有 discipline 字段就用，没有就返回 None
    disc = g.get("discipline")
    return str(disc) if disc is not None else None


def extract_video_id(v: dict) -> str | None:
    vid = v.get("id")
    return str(vid) if vid is not None else None


def extract_video_career_id(v: dict) -> str | None:
    cid = v.get("career_id")
    return str(cid) if cid is not None else None


def extract_video_discipline(v: dict) -> str | None:
    disc = v.get("discipline")
    return str(disc) if disc is not None else None


def unique_keep_order(seq):
    seen = set()
    out = []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


# ========== 3. 建索引：node -> games, discipline -> games ==========
games_by_node: dict[str, list[str]] = defaultdict(list)
games_by_disc: dict[str, list[str]] = defaultdict(list)

for g in games:
    gid = extract_game_id(g)
    if not gid:
        continue

    node = extract_game_node(g)
    disc = extract_game_discipline(g)

    if node:
        games_by_node[node].append(gid)
    if disc:
        games_by_disc[disc].append(gid)


# ========== 4. 建索引：career_id -> videos, discipline -> videos ==========
videos_by_career: dict[str, list[str]] = defaultdict(list)
videos_by_disc: dict[str, list[str]] = defaultdict(list)

for v in videos:
    vid = extract_video_id(v)
    if not vid:
        continue

    cid  = extract_video_career_id(v)
    disc = extract_video_discipline(v)

    if cid:
        videos_by_career[cid].append(vid)
    if disc:
        videos_by_disc[disc].append(vid)


# ========== 5. 遍历每个职业，填 recommended_games / recommended_videos ==========
for c in careers:
    cid = c.get("id")
    disciplines: list[str] = c.get("discipline") or []

    # 汇总这个职业需要的所有知识节点
    needed_nodes: set[str] = set()
    for block in c.get("required_skills_knowledge") or []:
        for n in block.get("knowledge_nodes", []):
            needed_nodes.add(str(n))

    # ----- 5.1 选游戏 -----
    game_candidates: list[str] = []

    # ① 按 knowledge node 精准匹配
    for n in needed_nodes:
        game_candidates.extend(games_by_node.get(n, []))

    # ② 按 discipline 补充
    for d in disciplines:
        game_candidates.extend(games_by_disc.get(d, []))

    game_candidates = unique_keep_order(game_candidates)[:MAX_GAMES_PER_CAREER]

    # ----- 5.2 选视频 -----
    video_candidates: list[str] = []

    # ① career_id 精准匹配
    if cid:
        video_candidates.extend(videos_by_career.get(cid, []))

    # ② 按 discipline 补充
    for d in disciplines:
        video_candidates.extend(videos_by_disc.get(d, []))

    video_candidates = unique_keep_order(video_candidates)[:MAX_VIDEOS_PER_CAREER]

    # ----- 5.3 写回 progression_path -----
    prog_list = c.get("progression_path") or []
    if not prog_list:
        # 兜底：如果真没有，就给一个默认结构
        prog_list = [{
            "year_range": "Year 7–10",
            "recommended_games": [],
            "recommended_videos": [],
        }]
        c["progression_path"] = prog_list

    # 暂时只写第一个 year_range
    prog_list[0]["recommended_games"]  = game_candidates
    prog_list[0]["recommended_videos"] = video_candidates


# ========== 6. 写出新文件 ==========
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with OUTPUT_PATH.open("w", encoding="utf-8") as f:
    json.dump({"careers": careers}, f, ensure_ascii=False, indent=2)

print(f"✅ 已完成填充，保存到: {OUTPUT_PATH}")
