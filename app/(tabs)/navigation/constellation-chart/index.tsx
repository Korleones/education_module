import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useFocusEffect } from "@react-navigation/native";
import ForceGraph2D from "react-force-graph-2d";
import careersData from "../../../../assets/data/careers_with_skills_knowledge_263.json";
import * as d3 from "d3";
import { loadSelectedStudent } from "../../../../utils/storage";

// ========= Type Definitions =========

type Connection = {
  target_career_id: string;
  weights: {
    shared_knowledge: number;
    skill_similarity: number;
    category: number;
  };
  total_weight: number;
};

type RequiredSkillsKnowledge = {
  discipline: string;
  skills: string[];
  knowledge_nodes: string[];
};

type Career = {
  id: string;
  title: string;
  discipline: string[];
  category: string;
  description: string;
  connections: Connection[];
  required_skills_knowledge: RequiredSkillsKnowledge[];
  progression_path?: any[];
};

type GraphNode = Career & {
  x?: number;
  y?: number;
};

type GraphLink = {
  source: string;
  target: string;
  weight: number;
};

type Student = {
  user_id: string;
  year: number;
  skills_levels: Record<string, number>;
  knowledge_progress: {
    node: string; // e.g. "EARTH.Y4.AC9S4U03"
    level: number; // 1..3
  }[];
  career_interests?: string[];
};

type FitLevel = "high" | "medium" | "low";

type MissingSkill = {
  name: string;
  current: number;
  target: number;
  delta: number;
};

type MissingKnowledge = {
  code: string;
  current: number; // exact 这门课（这个 AC9SxUyy）的 level（没上过就是 0）
  target: number;
  delta: number;
  bestYear: number; // 在这个 unit 上的最高 S 年级
  bestLevel: number; // 在这个 unit 上的最高 level
};

type CareerFitInfo = {
  level: FitLevel;
  score: number; // 0..1
  missingSkills: MissingSkill[];
  missingKnowledge: MissingKnowledge[];
};

// ========= Constants =========

// Skills: long name → student JSON code
const SKILL_MAP: Record<string, string> = {
  "Questioning & Predicting": "QP",
  "Planning & Conducting": "PC",
  "Processing & Analysing Data": "PAD",
  Evaluating: "EVAL",
  Communicating: "COMM",
};

// All careers assume target skill level 8
const TARGET_SKILL_LEVEL = 8;

// ========= Utils =========

// Rainbow color for links
const rainbowAt = (t: number) => {
  const hue = (1 - t) * 270;
  return `hsl(${hue} 90% 55% / 0.55)`;
};

// Normalize link endpoints
const getLinkEnds = (link: any) => {
  const srcId = typeof link.source === "object" ? link.source.id : link.source;
  const tgtId = typeof link.target === "object" ? link.target.id : link.target;
  return { srcId, tgtId };
};

// "EARTH.Y4.AC9S4U03" -> "AC9S4U03"
const extractCode = (fullNode: string) => {
  const parts = fullNode.split(".");
  return parts[parts.length - 1];
};

// "AC9S10U03" -> {year: 10, unit: "03"}
const parseYearAndUnit = (code: string) => {
  const m = code.match(/AC9S(\d{1,2})U(\d{2})/);
  if (!m) return null;
  return {
    year: parseInt(m[1], 10),
    unit: m[2],
  };
};

// ========= Fit Calculation =========

const computeCareerFit = (career: Career, student: Student): CareerFitInfo => {
  const rskList = career.required_skills_knowledge || [];

  // ===== Skills =====
  const requiredSkills = new Set<string>();
  for (const rsk of rskList) {
    for (const skillName of rsk.skills || []) {
      requiredSkills.add(skillName);
    }
  }

  const missingSkills: MissingSkill[] = [];
  const skillFractions: number[] = [];

  requiredSkills.forEach((skillName) => {
    const code = SKILL_MAP[skillName];
    if (!code) return;

    const current = student.skills_levels[code] ?? 0;
    const target = TARGET_SKILL_LEVEL;
    const delta = Math.max(0, target - current);

    const fraction = Math.min(current / target, 1);
    skillFractions.push(fraction);

    if (delta > 0) {
      missingSkills.push({ name: skillName, current, target, delta });
    }
  });

  const skillCompletion =
    skillFractions.length > 0
      ? skillFractions.reduce((a, b) => a + b, 0) / skillFractions.length
      : 0;


  type StudentUnit = {
    year: number; // e.g., 3..10
    unit: string; // "01" | "02" | "03" | "04"
    level: number; // 1..3
    code: string; // "AC9S4U03"
  };

  const studentUnits: StudentUnit[] = [];
  const exactKnowledgeMap: Record<string, number> = {}; // AC9S4U03 -> 1..3

  for (const kp of student.knowledge_progress || []) {
    const shortCode = extractCode(kp.node); // e.g. "AC9S4U03"
    const parsed = parseYearAndUnit(shortCode);
    if (!parsed) continue;

    studentUnits.push({
      year: parsed.year,
      unit: parsed.unit,
      level: kp.level,
      code: shortCode,
    });

    // 记录 exact 这门课的 mastery（如果同 code 出现多次，就取最高）
    if (exactKnowledgeMap[shortCode] == null) {
      exactKnowledgeMap[shortCode] = kp.level;
    } else {
      exactKnowledgeMap[shortCode] = Math.max(
        exactKnowledgeMap[shortCode],
        kp.level
      );
    }
  }

  const missingKnowledge: MissingKnowledge[] = [];
  const knowledgeFractions: number[] = [];

  for (const rsk of rskList) {
    for (const code of rsk.knowledge_nodes || []) {
      const req = parseYearAndUnit(code);
      if (!req) continue;

      const requiredYear = req.year;
      const requiredUnit = req.unit;

      // 1) 匹配度计算：用同 unit 下的最高 year+level
      const sameUnit = studentUnits.filter((u) => u.unit === requiredUnit);

      let bestYear = 0;
      let bestLevel = 0;

      if (sameUnit.length > 0) {
        sameUnit.sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return b.level - a.level;
        });
        bestYear = sameUnit[0].year;
        bestLevel = sameUnit[0].level;
      }

      let yearFactor = 0;
      if (bestYear > 0) {
        const maxDiff = 7; // S3..S10 差距最大 7
        const yearDiff = Math.max(0, requiredYear - bestYear);
        yearFactor = Math.max(0, 1 - yearDiff / maxDiff); // 年级越接近越高
      }

      const levelFactor = bestLevel / 3; // 0,1/3,2/3,1
      const fraction = yearFactor * levelFactor;
      knowledgeFractions.push(fraction);

      // 2) missing 列表展示：exact 课程 code 的掌握度
      const currentExactLevel = exactKnowledgeMap[code] ?? 0; // 只看这门课
      const targetMastery = 3;
      const delta = Math.max(0, targetMastery - currentExactLevel);

      // --- 新逻辑：只有在「没有达到或超过要求的 S 年级」的情况下才算 missing ---
      let isMissing = false;

      if (bestYear === 0) {
        // 完全没在这个 unit 上学过
        isMissing = true;
      } else if (bestYear < requiredYear) {
        // 在这个 unit 轨道上，但 S 年级还没到要求（比如要求 S9，他只有 S4）
        isMissing = true;
      } else if (bestYear === requiredYear) {
        // 年级刚好等于要求，看 mastery 是否达到3
        if (currentExactLevel < targetMastery) {
          isMissing = true;
        }
      } else if (bestYear > requiredYear) {
        // 学生在这个 unit 的 S 年级已经超出要求（比如要求 S9，他有 S10）→ 不 missing
        isMissing = false;
      }

      if (isMissing) {
        missingKnowledge.push({
          code,
          current: currentExactLevel,
          target: targetMastery,
          delta,
          bestYear,
          bestLevel,
        });
      }
    }
  }

  const knowledgeCompletion =
    knowledgeFractions.length > 0
      ? knowledgeFractions.reduce((a, b) => a + b, 0) /
        knowledgeFractions.length
      : 0;

  // ===== Combine =====
  let baseScore = 0.5 * skillCompletion + 0.5 * knowledgeCompletion;

  if (student.career_interests?.includes(career.id)) {
    baseScore += 0.05;
  }

  const score = Math.max(0, Math.min(baseScore, 1));

  let level: FitLevel;
  if (score >= 0.66) level = "high";
  else if (score >= 0.33) level = "medium";
  else level = "low";

  return {
    level,
    score,
    missingSkills,
    missingKnowledge,
  };
};

// ========= Main Component =========

const CareerGraph: React.FC = () => {
  const fgRef = useRef<any>(null);

  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [fitMap, setFitMap] = useState<Record<string, CareerFitInfo>>({});
  const [modalRefreshKey, setModalRefreshKey] = useState(0);

  // When modal is open, disable hover highlighting
  const effectiveHoverNode = selectedNode ? null : hoverNode;

  // Initial load
  useEffect(() => {
    const load = async () => {
      try {
        const s = await loadSelectedStudent();
        if (s) setStudent(s);
      } catch (e) {
        console.error("Error loading selected student", e);
      }
    };
    load();
  }, []);

  // Reload student whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      const loadOnFocus = async () => {
        try {
          const s = await loadSelectedStudent();
          if (s) setStudent(s);
        } catch (e) {
          console.error("Error loading selected student on focus", e);
        }
      };
      loadOnFocus();
      return () => {};
    }, [])
  );

  // Static graph data
  const graphData = useMemo(() => {
    const careers: Career[] = (careersData as any).careers;

    const nodes: GraphNode[] = careers.map((c) => ({ ...c }));

    const links: GraphLink[] = careers.flatMap((career) =>
      career.connections
        .filter((c) =>
          careers.some((t) => t.id === c.target_career_id)
        )
        .map((c) => ({
          source: career.id,
          target: c.target_career_id,
          weight: c.total_weight,
        }))
    );

    return { nodes, links };
  }, []);

  // Recompute fit map whenever student changes
  useEffect(() => {
    if (!student) {
      setFitMap({});
      setSelectedNode(null);
      return;
    }

    const careers: Career[] = (careersData as any).careers;
    const newMap: Record<string, CareerFitInfo> = {};
    for (const c of careers) {
      newMap[c.id] = computeCareerFit(c, student);
    }
    setFitMap(newMap);
    setModalRefreshKey((k) => k + 1);
    setSelectedNode(null);
  }, [student]);

  // Category → color map
  const categoryColorMap = useMemo(() => {
    const cats = Array.from(new Set(graphData.nodes.map((n) => n.category)));
    const palette = [
      ...(d3.schemeTableau10 as string[]),
      ...((d3.schemeSet3 || []) as string[]),
    ];
    const map: Record<string, string> = {};
    cats.forEach((cat, idx) => {
      map[cat] = palette[idx % palette.length];
    });
    return map;
  }, [graphData]);

  const getFitForNode = (node: GraphNode | null): CareerFitInfo | null =>
    node ? fitMap[node.id] || null : null;

  const selectedFit = getFitForNode(selectedNode);

  // ===== Required capabilities for selected career (for modal display) =====
  const requiredSkillsForSelected = useMemo(() => {
    if (!selectedNode) return [];
    const set = new Set<string>();
    (selectedNode.required_skills_knowledge || []).forEach((rsk) => {
      (rsk.skills || []).forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [selectedNode]);

  const requiredKnowledgeForSelected = useMemo(() => {
    if (!selectedNode) return [];
    const set = new Set<string>();
    (selectedNode.required_skills_knowledge || []).forEach((rsk) => {
      (rsk.knowledge_nodes || []).forEach((k) => set.add(k));
    });
    return Array.from(set);
  }, [selectedNode]);

  const renderFitLabel = (level?: FitLevel) => {
    if (!level) return "Unknown";
    if (level === "high") return "High";
    if (level === "medium") return "Medium";
    return "Low";
  };

  const fitColor = (level?: FitLevel) => {
    if (!level) return "#6b7280";
    if (level === "high") return "#16a34a";
    if (level === "medium") return "#f59e0b";
    return "#ef4444";
  };

  return (
    


    <div style={{ position: "relative" }}>
      {/* Back Button */}
<div
  onClick={() => (window.location.href = "/navigation")}  // 跳回 navigation
  style={{
    position: "absolute",
    top: 20,
    left: 20,
    display: "flex",
    alignItems: "center",
    padding: "8px 14px",
    background: "rgba(255,255,255,0.9)",
    borderRadius: "20px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    zIndex: 9999,
    userSelect: "none",
    transition: "transform 0.15s ease",
  }}
  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
>
  <span style={{ marginRight: 6, fontSize: "18px" }}>←</span>
  Back
</div>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 20,
          background: "rgba(255,255,255,0.9)",
          padding: "12px 16px",
          borderRadius: 8,
          zIndex: 10,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          Career Categories
        </div>
        {Object.entries(categoryColorMap).map(([cat, color]) => (
          <div
            key={cat}
            style={{ display: "flex", alignItems: "center", marginBottom: 4 }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                backgroundColor: color,
                borderRadius: 3,
                marginRight: 6,
                border: "1px solid #0003",
              }}
            />
            {cat}
          </div>
        ))}
      </div>

      {/* Modal overlay */}
      {selectedNode && (
        <div
          onClick={() => setSelectedNode(null)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.45)",
            zIndex: 15,
          }}
        />
      )}

      {/* Modal */}
      {selectedNode && (
        <div
          key={modalRefreshKey}
          style={{
            position: "absolute",
            top: "5%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            padding: "20px",
            borderRadius: 12,
            width: 480,
            maxHeight: "70%",
            overflowY: "auto",
            boxShadow: "0 6px 24px rgba(0,0,0,0.22)",
            zIndex: 20,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            {selectedNode.title}
          </div>

          <div style={{ marginBottom: 6 }}>
            <b>Category:</b> {selectedNode.category}
          </div>

          <div style={{ marginBottom: 6 }}>
            <b>Discipline:</b> {selectedNode.discipline.join(", ")}
          </div>

          <div style={{ marginBottom: 10 }}>
            <b>Description:</b>
            <div style={{ marginTop: 4 }}>{selectedNode.description}</div>
          </div>

          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <b>Fit level:</b>
            {student ? (
              <span
                style={{
                  fontWeight: 600,
                  color: fitColor(selectedFit?.level),
                  marginLeft: 4,
                }}
              >
                {renderFitLabel(selectedFit?.level)}{" "}
                {selectedFit && `(${Math.round(selectedFit.score * 100)}%)`}
              </span>
            ) : (
              <span style={{ color: "#6b7280", marginLeft: 4 }}>
                No student selected
              </span>
            )}
          </div>

          {/* Required capabilities */}
          {selectedFit && (
            <>
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <b>Required skills:</b>
                <div style={{ marginTop: 4 }}>
                  {requiredSkillsForSelected.length > 0 ? (
                    <ul style={{ paddingLeft: 18, margin: 0 }}>
                      {requiredSkillsForSelected.map((skill) => {
                        const isMissing =
                          selectedFit.missingSkills.find(
                            (ms) => ms.name === skill
                          ) != null;
                        return (
                          <li key={skill}>
                            {skill}{" "}
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 12,
                                padding: "2px 6px",
                                borderRadius: 999,
                                backgroundColor: isMissing
                                  ? "rgba(248,113,113,0.12)"
                                  : "rgba(22,163,74,0.12)",
                                color: isMissing ? "#b91c1c" : "#166534",
                              }}
                            >
                              {isMissing ? "Not yet" : "Achieved"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <span>No specific skills listed</span>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <b>Required knowledge units:</b>
                <div style={{ marginTop: 4 }}>
                  {requiredKnowledgeForSelected.length > 0 ? (
                    <ul style={{ paddingLeft: 18, margin: 0 }}>
                      {requiredKnowledgeForSelected.map((code) => {
                        const missingEntry = selectedFit.missingKnowledge.find(
                          (mk) => mk.code === code
                        );
                        const isMissing = !!missingEntry;
                        return (
                          <li key={code}>
                            {code}{" "}
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 12,
                                padding: "2px 6px",
                                borderRadius: 999,
                                backgroundColor: isMissing
                                  ? "rgba(248,113,113,0.12)"
                                  : "rgba(22,163,74,0.12)",
                                color: isMissing ? "#b91c1c" : "#166534",
                              }}
                            >
                              {isMissing ? "Not yet" : "Covered or exceeded"}
                            </span>
                            {missingEntry && (
                              <span style={{ marginLeft: 4, color: "#6b7280" }}>
                                current {missingEntry.current} / target{" "}
                                {missingEntry.target}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <span>No specific units listed</span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Missing sections */}
          {student && selectedFit && (
            <>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 8,
                  borderTop: "1px dashed #e5e7eb",
                }}
              >
                <b>Missing skills (target level 8):</b>
                <div style={{ marginTop: 4 }}>
                  {selectedFit.missingSkills.length > 0 ? (
                    <ul style={{ paddingLeft: 18, margin: 0 }}>
                      {selectedFit.missingSkills.map((s) => (
                        <li key={s.name}>
                          {s.name}: current {s.current} / target {s.target}{" "}
                          (needs +{s.delta})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span>No obvious missing skills</span>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: "1px dashed #e5e7eb",
                }}
              >
                <b>Missing knowledge:</b>
                <div style={{ marginTop: 4 }}>
                  {selectedFit.missingKnowledge.length > 0 ? (
                    <ul style={{ paddingLeft: 18, margin: 0 }}>
                      {selectedFit.missingKnowledge.map((k) => (
                        <li key={k.code}>
                          {k.code}: current {k.current} / target {k.target}{" "}
                          (needs +{k.delta})
                          {k.bestYear > 0 && (
                            <span style={{ color: "#6b7280" }}>
                              {" "}
                              – highest in this unit: S{k.bestYear}, level{" "}
                              {k.bestLevel}
                            </span>
                          )}
                          {k.bestYear === 0 && (
                            <span style={{ color: "#6b7280" }}>
                              {" "}
                              – this discipline unit not started yet
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span>No obvious missing knowledge</span>
                  )}
                </div>
              </div>
            </>
          )}

          <button
            onClick={() => {
              // TODO: navigate to pathway screen or open detail
              console.log("View pathway for:", selectedNode.id);
            }}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "10px 0",
              borderRadius: 6,
              fontSize: 16,
              border: "none",
              background: "#10b981",
              color: "white",
              cursor: "pointer",
            }}
          >
            View Pathway
          </button>

          <button
            onClick={() => setSelectedNode(null)}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "10px 0",
              borderRadius: 6,
              fontSize: 16,
              border: "none",
              background: "#3b82f6",
              color: "white",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* ForceGraph2D */}
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={window.innerWidth}
        height={window.innerHeight}
        nodeColor={(node: any) =>
          categoryColorMap[node.category] || "#999999"
        }
        onNodeHover={(n) => setHoverNode(n as GraphNode)}
        onNodeClick={(node) => setSelectedNode(node as GraphNode)}
        cooldownTicks={200}
        d3VelocityDecay={0.25}
        onEngineTick={() => {
          const fg = fgRef.current;
          if (!fg) return;
      
          fg.d3Force("charge")?.strength(-600).distanceMax(1200);
          fg.d3Force("link")?.distance(180);
          fg.d3Force("collide")?.radius(40);
        }}
        linkWidth={(link: any) => {
          if (!effectiveHoverNode) return 0.8;
          const { srcId, tgtId } = getLinkEnds(link);
          const connected =
            srcId === effectiveHoverNode.id ||
            tgtId === effectiveHoverNode.id;
          return connected ? 2 + link.weight * 4 : 0.25;
        }}
        linkColor={(link: any) => {
          if (!effectiveHoverNode) return "rgba(100,149,237,0.35)";

          const { srcId, tgtId } = getLinkEnds(link);
          const connected =
            srcId === effectiveHoverNode.id ||
            tgtId === effectiveHoverNode.id;

          if (!connected) return "rgba(180,180,180,0.12)";

          const neighborLinks = (graphData.links as any[])
            .filter((l) => {
              const { srcId: s, tgtId: t } = getLinkEnds(l);
              return (
                s === effectiveHoverNode.id || t === effectiveHoverNode.id
              );
            })
            .sort((a: any, b: any) => b.weight - a.weight);

          const index = neighborLinks.findIndex((l: any) => {
            const { srcId: s, tgtId: t } = getLinkEnds(l);
            return s === srcId && t === tgtId;
          });

          const t =
            neighborLinks.length > 1
              ? index / (neighborLinks.length - 1)
              : 0;

          return rainbowAt(t);
        }}
        linkDirectionalParticles={(link: any) => {
          if (!effectiveHoverNode) return 0;
          const { srcId, tgtId } = getLinkEnds(link);
          return srcId === effectiveHoverNode.id ||
            tgtId === effectiveHoverNode.id
            ? 3
            : 0;
        }}
        linkDirectionalParticleSpeed={(link: any) => {
          if (!effectiveHoverNode) return 0;
          const { srcId, tgtId } = getLinkEnds(link);
          const connected =
            srcId === effectiveHoverNode.id ||
            tgtId === effectiveHoverNode.id;
          return connected ? 0.002 + (link.weight || 0) * 0.001 : 0;
        }}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const fit = fitMap[node.id];
          const fitLevel: FitLevel | undefined = fit?.level;

          // Base radius by fit level — 更夸张一点
          let baseRadius = 5;
          if (fitLevel === "high") baseRadius = 18;
          else if (fitLevel === "medium") baseRadius = 11;
          else baseRadius = 6;

          let radius = baseRadius;
          let isNeighbor = false;

          if (effectiveHoverNode) {
            const neighborLinks = (graphData.links as any[])
              .filter((l) => {
                const { srcId, tgtId } = getLinkEnds(l);
                return (
                  srcId === effectiveHoverNode.id ||
                  tgtId === effectiveHoverNode.id
                );
              })
              .sort((a, b) => b.weight - a.weight);

            const neighbors = neighborLinks.map((l) => {
              const { srcId, tgtId } = getLinkEnds(l);
              return srcId === effectiveHoverNode.id ? l.target : l.source;
            });

            const index = neighbors.findIndex(
              (n: any) =>
                (typeof n === "object" ? n.id : n) === node.id
            );

            if (node.id === effectiveHoverNode.id) {
              radius = baseRadius;
            } else if (index !== -1) {
              isNeighbor = true;
              const t =
                neighbors.length > 1
                  ? index / (neighbors.length - 1)
                  : 0;
              radius = baseRadius + (6 - 3 * t);
            }
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle =
            categoryColorMap[node.category] || "#999999";
          ctx.fill();

          // 高匹配再加一圈描边，更夸张一点
          if (fitLevel === "high") {
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(22,163,74,0.9)";
            ctx.stroke();
          } else if (fitLevel === "medium") {
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "rgba(245,158,11,0.8)";
            ctx.stroke();
          }

          const showLabel =
            globalScale > 1.3 ||
            (effectiveHoverNode &&
              (node.id === effectiveHoverNode.id || isNeighbor));

          if (showLabel) {
            const fontSize = 12 / Math.max(globalScale, 1.3);
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#000";
            ctx.fillText(node.title, node.x, node.y + radius + 4);
          }
        }}
        nodeCanvasObjectMode={() => "after"}
      />
    </div>
  );
};

export default CareerGraph;
