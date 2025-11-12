import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Modal, Text, ScrollView, TouchableOpacity, PanResponder, Dimensions, LogBox } from 'react-native';
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide } from 'd3-force';
import { scaleLinear, scaleSqrt } from 'd3-scale';

// 导入路径组件
import ScrollableCareerSteps from '../ScrollableSteps';

// 禁用无关警告
LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

// 类型定义
interface SkillLevels {
    [key: string]: number;
}

interface KnowledgeNode {
    node: string;
    min_level: number;
    weight: number;
}

interface CareerNode {
    id: string;
    title: string;
    category: string;
    min_skill_levels: SkillLevels;
    required_knowledge: KnowledgeNode[];
    threshold?: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

interface Link {
    id: string;
    source: string;
    target: string;
    strength: number;
    category: string;
}

interface SimNode extends CareerNode {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

interface ScoredNode extends CareerNode {
    fit: number;              // 综合匹配度
    skillFit: number;         // 技能匹配度
    knowFit: number;          // 知识匹配度
    skillScores?: {
        [key: string]: {
            required: number;
            actual: number;
            score: number;
        }
    };
    knowledgeScores?: {
        [key: string]: {
            required: number;
            actual: number;
            weight: number;
            score: number;
        }
    };
}

interface CareerData {
    careers: CareerNode[];
}

interface CareerConstellationProps {
    userSkills?: SkillLevels;
    userKnowledges?: { [key: string]: number };
    userId: string;
    onNavigateToSteps: (careerId: string) => void; // 新增：切换到路径组件的回调
    onNavigateBack: () => void; // 新增：返回星座图的回调
    isShowingSteps: boolean; // 新增：是否显示路径组件的状态
    currentCareerId?: string; // 新增：当前选中的职业ID
}

// 加载数据
import rawCareers from '../../../../assets/data/STEM Careers.json';

// 屏幕尺寸
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONTENT_WIDTH = SCREEN_WIDTH * 2;
const CONTENT_HEIGHT = SCREEN_HEIGHT * 2;

// 视觉参数
const BASE_NODE_R = 6;
const RADIUS_RANGE = 24;
const MIN_OPACITY = 0.15;
const MAX_OPACITY = 1.0;
const MIN_STROKE_WIDTH = 0.8;
const MAX_STROKE_WIDTH = 3.5;
const FIT_LOW = 0.5;
const FIT_HIGH = 0.85;

// 类别基础颜色配置
const BASE_COLORS: { [key: string]: string } = {
    'Biology/Nature': '#1B5E20',
    'Chemistry/Materials': '#0D47A1',
    'Physics/Engineering/Tech': '#BF360C',
    'Earth/Environment/Geo': '#3E2723',
    'Data/AI/Comms': '#4A148C',
};

// 颜色处理工具函数
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const rgbToHex = (r: number, g: number, b: number) => {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const getBrightColor = (baseHex: string, fit: number) => {
    const rgb = hexToRgb(baseHex);
    if (!rgb) return baseHex;

    const brightnessIncrement = Math.floor(
        scaleLinear()
            .domain([FIT_LOW, FIT_HIGH])
            .range([0, 60])(fit)
    );

    const newR = Math.min(255, rgb.r + brightnessIncrement);
    const newG = Math.min(255, rgb.g + brightnessIncrement);
    const newB = Math.min(255, rgb.b + brightnessIncrement);

    return rgbToHex(newR, newG, newB);
};

const CareerConstellation: React.FC<CareerConstellationProps> = ({
                                                                     userSkills = {},
                                                                     userKnowledges = {},
                                                                     onNavigateToSteps,
                                                                     isShowingSteps
                                                                 }) => {
    // 状态管理
    const [nodes, setNodes] = useState<CareerNode[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [simNodes, setSimNodes] = useState<SimNode[]>([]);
    const [isSimulationStable, setIsSimulationStable] = useState(false);
    const [selected, setSelected] = useState<ScoredNode | null>(null);
    const [transform, setTransform] = useState({
        translateX: 0,
        translateY: 0,
        scale: 1
    });
    const [isDragging, setIsDragging] = useState(false);
    const lastPanState = useRef({ x: 0, y: 0, distance: 0 });

    // 初始化数据
    useEffect(() => {
        const careers = (rawCareers as CareerData)?.careers || [];
        if (careers.length === 0) {
            console.warn('⚠️ 未找到职业数据');
            return;
        }

        // 构造节点
        const careerNodes: CareerNode[] = careers.map(c => ({
            ...c,
            id: c.id || `career_${c.title.replace(/\s+/g, '_')}`,
            category: c.category || 'Data/AI/Comms'
        }));
        setNodes(careerNodes);

        // 构造连线
        const careerLinks: Link[] = [];
        for (let i = 0; i < careerNodes.length; i++) {
            for (let j = i + 1; j < careerNodes.length; j++) {
                if (careerNodes[i].category !== careerNodes[j].category) continue;

                const skillOverlap = Object.keys(careerNodes[i].min_skill_levels || {}).filter(
                    skill => (careerNodes[j].min_skill_levels || {})[skill] != null
                ).length;

                if (skillOverlap > 0) {
                    careerLinks.push({
                        id: `link_${careerNodes[i].id}_${careerNodes[j].id}`,
                        source: careerNodes[i].id,
                        target: careerNodes[j].id,
                        strength: skillOverlap,
                        category: careerNodes[i].category,
                    });
                }
            }
        }
        setLinks(careerLinks);
    }, []);

    // 计算适合度
    const scoredNodes = useMemo((): ScoredNode[] => {
        return nodes.map((n) => {
            // 技能匹配度计算
            const skillKeys = Object.keys(n.min_skill_levels || {});
            const skillScores: ScoredNode['skillScores'] = {};

            skillKeys.forEach(k => {
                const required = n.min_skill_levels[k];
                const actual = userSkills[k] || 0;
                let baseScore = Math.min(1.0, actual / required);

                if (baseScore < 0.4) baseScore *= 0.4;
                else if (baseScore < 0.7) baseScore = 0.16 + (baseScore - 0.4) * 1.13;
                else baseScore = 0.5 + (baseScore - 0.7) * 1.67;

                skillScores[k] = { required, actual, score: baseScore };
            });

            const skillFit = skillKeys.length === 0
                ? 0
                : Object.values(skillScores).reduce((sum, item) => sum + item.score, 0) / skillKeys.length;

            // 知识匹配度计算
            const knowledgeScores: ScoredNode['knowledgeScores'] = {};
            let weightedKnowledgeSum = 0;

            (n.required_knowledge || []).forEach(kn => {
                const required = kn.min_level;
                const actual = userKnowledges[kn.node] || 0;
                let baseScore = actual >= required ? kn.weight : (actual / required) * kn.weight;

                if (n.threshold) {
                    baseScore = baseScore / n.threshold;
                    if (baseScore < 0.4) baseScore *= 0.4;
                    else if (baseScore < 0.7) baseScore = 0.16 + (baseScore - 0.4) * 1.13;
                    else baseScore = 0.5 + (baseScore - 0.7) * 1.67;
                } else {
                    baseScore = 0;
                }

                weightedKnowledgeSum += baseScore * kn.weight;
                knowledgeScores[kn.node] = { required, actual, weight: kn.weight, score: baseScore };
            });

            const knowFit = n.threshold && n.required_knowledge.length > 0
                ? Math.min(1, weightedKnowledgeSum / (n.threshold || 1))
                : 0;

            // 综合匹配度
            let fit = (skillFit * 0.55 + knowFit * 0.45);
            fit = Math.max(0, Math.min(1, fit));

            if (fit < 0.3) fit *= 0.7;
            else if (fit > 0.7) fit = 0.51 + (fit - 0.7) * 1.2;

            return { ...n, fit, skillFit, knowFit, skillScores, knowledgeScores };
        });
    }, [nodes, userSkills, userKnowledges]);

    // 力导向图初始化
    useEffect(() => {
        if (nodes.length === 0 || links.length === 0) return;

        // 初始节点位置
        const initialNodes: SimNode[] = nodes.map((d, index) => {
            const angle = (index / nodes.length) * 2 * Math.PI;
            const radius = Math.min(CONTENT_WIDTH, CONTENT_HEIGHT) * 0.3;
            return {
                ...d,
                x: CONTENT_WIDTH / 2 + radius * Math.cos(angle),
                y: CONTENT_HEIGHT / 2 + radius * Math.sin(angle)
            };
        });
        setSimNodes(initialNodes);

        // 力导向模拟
        const simulation = forceSimulation(initialNodes)
            .force('collide', forceCollide().radius(d => {
                const scoredNode = scoredNodes.find(n => n.id === d.id);
                const fit = scoredNode?.fit || 0.7;
                const normalized = Math.max(0, Math.min(1, (fit - FIT_LOW) / (FIT_HIGH - FIT_LOW)));
                return BASE_NODE_R + normalized * RADIUS_RANGE + 8;
            }).strength(0.7))
            .force('charge', forceManyBody().strength(-220).distanceMax(280))
            .force('link', forceLink<SimNode, Link>(links)
                .id(d => d.id)
                .distance(link => 130 + link.strength * 10)
                .strength(link => 0.4 + link.strength * 0.1)
            )
            .force('center', forceCenter(CONTENT_WIDTH / 2, CONTENT_HEIGHT / 2).strength(0.05))
            .velocityDecay(0.4)
            .alpha(0.6)
            .alphaDecay(0.02)
            .alphaMin(0.001);

        simulation.on('end', () => setIsSimulationStable(true));
        simulation.on('tick', () => setSimNodes([...simulation.nodes()]));

        const stopTimer = setTimeout(() => {
            simulation.alphaTarget(0);
            simulation.velocityDecay(0.8);
        }, 2000);

        return () => {
            clearTimeout(stopTimer);
            simulation.stop();
        };
    }, [nodes, links, scoredNodes]);

    // 初始化视图位置
    useEffect(() => {
        if (isSimulationStable && simNodes.length > 0) {
            const xs = simNodes.map(n => n.x);
            const ys = simNodes.map(n => n.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            setTransform({
                translateX: SCREEN_WIDTH / 2 - centerX,
                translateY: SCREEN_HEIGHT / 2 - centerY,
                scale: 1
            });
        }
    }, [isSimulationStable, simNodes]);

    // 手势响应器
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt) => {
            lastPanState.current = {
                x: evt.nativeEvent.pageX,
                y: evt.nativeEvent.pageY,
                distance: 0
            };

            if (evt.nativeEvent.touches.length === 2) {
                const touch1 = evt.nativeEvent.touches[0];
                const touch2 = evt.nativeEvent.touches[1];
                lastPanState.current.distance = Math.hypot(
                    touch1.pageX - touch2.pageX,
                    touch1.pageY - touch2.pageY
                );
            }
            setIsDragging(false);
        },

        onPanResponderMove: (evt, gesture) => {
            const touches = evt.nativeEvent.touches;

            // 双指缩放
            if (touches.length === 2) {
                const touch1 = touches[0];
                const touch2 = touches[1];
                const currentDistance = Math.hypot(
                    touch1.pageX - touch2.pageX,
                    touch1.pageY - touch2.pageY
                );

                const initialDistance = lastPanState.current.distance || currentDistance;
                if (initialDistance > 0) {
                    const scaleFactor = currentDistance / initialDistance;
                    const newScale = Math.min(Math.max(transform.scale * scaleFactor, 0.3), 3);
                    setTransform(prev => ({ ...prev, scale: newScale }));
                    lastPanState.current.distance = currentDistance;
                }
                setIsDragging(true);
            }
            // 单指拖拽
            else if (touches.length === 1) {
                setTransform(prev => ({
                    ...prev,
                    translateX: prev.translateX + gesture.dx / prev.scale,
                    translateY: prev.translateY + gesture.dy / prev.scale
                }));
                setIsDragging(true);
            }
        },

        onPanResponderRelease: () => {
            setIsDragging(false);
            lastPanState.current = { x: 0, y: 0, distance: 0 };
        },

        onPanResponderTerminate: () => {
            setIsDragging(false);
            lastPanState.current = { x: 0, y: 0, distance: 0 };
        }
    }), [transform]);

    // 节点视觉映射函数
    const radiusScale = useMemo(() => scaleSqrt().domain([FIT_LOW, FIT_HIGH]).range([BASE_NODE_R, BASE_NODE_R + RADIUS_RANGE]), []);
    const opacityScale = useMemo(() => scaleLinear().domain([FIT_LOW, FIT_HIGH]).range([MIN_OPACITY, MAX_OPACITY]), []);
    const strokeWidthScale = useMemo(() => scaleLinear().domain([FIT_LOW, FIT_HIGH]).range([MIN_STROKE_WIDTH, MAX_STROKE_WIDTH]), []);

    const getNodeRadius = (fit: number) => {
        if (fit <= FIT_LOW) return BASE_NODE_R;
        if (fit >= FIT_HIGH) return BASE_NODE_R + RADIUS_RANGE;
        return radiusScale(fit);
    };

    const getNodeOpacity = (fit: number) => {
        if (fit <= FIT_LOW) return MIN_OPACITY;
        if (fit >= FIT_HIGH) return MAX_OPACITY;
        return opacityScale(fit);
    };

    const getStrokeWidth = (fit: number) => {
        if (fit <= FIT_LOW) return MIN_STROKE_WIDTH;
        if (fit >= FIT_HIGH) return MAX_STROKE_WIDTH;
        return strokeWidthScale(fit);
    };

    // 节点点击处理
    const handleNodePress = (node: ScoredNode) => {
        if (!isDragging) setSelected(node);
    };

    // 重置视图
    const resetView = () => {
        if (simNodes.length > 0) {
            const xs = simNodes.map(n => n.x);
            const ys = simNodes.map(n => n.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            setTransform({
                translateX: SCREEN_WIDTH / 2 - centerX,
                translateY: SCREEN_HEIGHT / 2 - centerY,
                scale: 1
            });
        }
    };

    // 渲染星座图
    return (
        <>
            {/* 控制按钮 */}
            <View style={styles.controls}>
                <TouchableOpacity style={styles.controlButton} onPress={resetView}>
                    <Text style={styles.controlText}>重置视图</Text>
                </TouchableOpacity>
                <Text style={styles.zoomText}>缩放: {(transform.scale * 100).toFixed(0)}%</Text>
            </View>

            {/* 适配度图例 */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <Circle
                        cx={0} cy={0}
                        r={getNodeRadius(FIT_LOW)}
                        fill={getBrightColor('#888', FIT_LOW)}
                        fillOpacity={getNodeOpacity(FIT_LOW)}
                        stroke="#f0f0f0"
                        strokeWidth={getStrokeWidth(FIT_LOW)}
                    />
                    <Text style={styles.legendText}>{(FIT_LOW * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.legendItem}>
                    <Circle
                        cx={0} cy={0}
                        r={getNodeRadius((FIT_LOW + FIT_HIGH) / 2)}
                        fill={getBrightColor('#888', (FIT_LOW + FIT_HIGH) / 2)}
                        fillOpacity={getNodeOpacity((FIT_LOW + FIT_HIGH) / 2)}
                        stroke="#f0f0f0"
                        strokeWidth={getStrokeWidth((FIT_LOW + FIT_HIGH) / 2)}
                    />
                    <Text style={styles.legendText}>{((FIT_LOW + FIT_HIGH) / 2 * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.legendItem}>
                    <Circle
                        cx={0} cy={0}
                        r={getNodeRadius(FIT_HIGH)}
                        fill={getBrightColor('#888', FIT_HIGH)}
                        fillOpacity={getNodeOpacity(FIT_HIGH)}
                        stroke="#f0f0f0"
                        strokeWidth={getStrokeWidth(FIT_HIGH)}
                    />
                    <Text style={styles.legendText}>{(FIT_HIGH * 100).toFixed(0)}%</Text>
                </View>
            </View>

            {/* SVG容器 */}
            <View style={styles.svgContainer} {...panResponder.panHandlers}>
                <Svg
                    width={SCREEN_WIDTH}
                    height={SCREEN_HEIGHT}
                    viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <G transform={`translate(${transform.translateX}, ${transform.translateY}) scale(${transform.scale})`}>
                        {/* 渲染连线 */}
                        {links.map((link) => {
                            const sourceNode = simNodes.find(n => n.id === link.source);
                            const targetNode = simNodes.find(n => n.id === link.target);
                            if (!sourceNode || !targetNode) return null;

                            const baseColor = BASE_COLORS[link.category] || '#888';
                            const linkColor = getBrightColor(baseColor, 0.65);

                            return (
                                <Line
                                    key={link.id}
                                    x1={sourceNode.x}
                                    y1={sourceNode.y}
                                    x2={targetNode.x}
                                    y2={targetNode.y}
                                    stroke={linkColor}
                                    strokeWidth="1.5"
                                    strokeOpacity="0.4"
                                    pointerEvents="none"
                                />
                            );
                        })}

                        {/* 渲染节点 */}
                        {scoredNodes.map((n) => {
                            const pos = simNodes.find(node => node.id === n.id);
                            if (!pos) return null;

                            const baseColor = BASE_COLORS[n.category] || '#888';
                            const fit = n.fit || 0;
                            const r = getNodeRadius(fit);
                            const opacity = getNodeOpacity(fit);
                            const strokeWidth = getStrokeWidth(fit);
                            const isSelected = selected?.id === n.id;
                            const nodeColor = getBrightColor(baseColor, fit);
                            const renderGlow = fit > 0.8;

                            return (
                                <G key={n.id} onPress={() => handleNodePress(n)}>
                                    {renderGlow && (
                                        <Circle
                                            cx={pos.x}
                                            cy={pos.y}
                                            r={r * 1.6}
                                            fill={nodeColor}
                                            fillOpacity={0.35}
                                            pointerEvents="none"
                                        />
                                    )}

                                    <Circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={isSelected ? r + 4 : r}
                                        fill={nodeColor}
                                        fillOpacity={opacity}
                                        stroke={isSelected ? '#ffffff' : '#f0f0f0'}
                                        strokeWidth={isSelected ? 3.5 : strokeWidth}
                                    />

                                    <SvgText
                                        x={pos.x}
                                        y={pos.y + r + 14}
                                        fontSize={fit > 0.8 ? 12 : fit > 0.6 ? 11 : 10}
                                        textAnchor="middle"
                                        fill="#222"
                                        pointerEvents="none"
                                        opacity={Math.max(opacity, 0.75)}
                                        fontWeight={fit > 0.8 ? 'bold' : fit > 0.6 ? '500' : 'normal'}
                                    >
                                        {n.title.length > 12 ? n.title.slice(0, 12) + '…' : n.title}
                                    </SvgText>
                                </G>
                            );
                        })}
                    </G>
                </Svg>
            </View>

            {/* 使用说明 */}
            <View style={styles.instructions}>
                <Text style={styles.instructionText}>双指缩放 • 单指拖拽 • 点击查看详情</Text>
            </View>

            {/* 详情弹窗 - 包含View PathWay按钮 */}
            <Modal
                visible={!!selected && !isShowingSteps}
                transparent
                animationType="slide"
                onRequestClose={() => setSelected(null)}
            >
                <ScrollView style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.title}>{selected?.title}</Text>
                        <Text style={styles.sub}>Category: {selected?.category}</Text>
                        <Text style={[styles.sub, {
                            color: (selected?.fit || 0) > 0.8 ? '#1B5E20' :
                                (selected?.fit || 0) > 0.6 ? '#8BC34A' : '#E65100'
                        }]}>
                            Overall Fit: {((selected?.fit || 0) * 100).toFixed(0)}%
                        </Text>
                        <Text style={styles.sub}>Skill Fit: {((selected?.skillFit || 0) * 100).toFixed(0)}%</Text>
                        <Text style={styles.sub}>Knowledge Fit: {((selected?.knowFit || 0) * 100).toFixed(0)}%</Text>

                        {/* 技能匹配详情 */}
                        <Text style={styles.section}>Skill Match Breakdown</Text>
                        {selected?.skillScores && Object.keys(selected.skillScores).length > 0 ? (
                            Object.entries(selected.skillScores).map(([k, v]) => (
                                <Text key={k} style={styles.row}>
                                    {k}: Required {v.required} · You Have {v.actual}
                                    {' '}({(v.score * 100).toFixed(0)}%)
                                    {v.actual >= v.required ? ' ✔' : ' ✘'}
                                </Text>
                            ))
                        ) : (
                            <Text style={styles.empty}>No skill requirements</Text>
                        )}

                        {/* 知识匹配详情 */}
                        <Text style={styles.section}>Knowledge Match Breakdown</Text>
                        {selected?.knowledgeScores && Object.keys(selected.knowledgeScores).length > 0 ? (
                            Object.entries(selected.knowledgeScores).map(([k, v]) => (
                                <Text key={k} style={styles.row}>
                                    {k}: Required Lv{v.required} · You Have Lv{v.actual}
                                    {' '}(Weight: {v.weight}, Score: {(v.score * 100).toFixed(0)}%)
                                    {v.actual >= v.required ? ' ✔' : ' ✘'}
                                </Text>
                            ))
                        ) : (
                            <Text style={styles.empty}>No knowledge requirements</Text>
                        )}

                        {/* 查看路径按钮 */}
                        <TouchableOpacity
                            style={styles.pathwayButton}
                            onPress={() => {
                                if (selected?.id) {
                                    onNavigateToSteps(selected.id); // 触发切换到路径组件
                                    setSelected(null); // 关闭弹窗
                                }
                            }}
                        >
                            <Text style={styles.pathwayButtonText}>View PathWay</Text>
                        </TouchableOpacity>

                        {/* 关闭按钮 */}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setSelected(null)}
                        >
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    controls: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    controlButton: {
        backgroundColor: '#0D47A1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    controlText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    zoomText: {
        fontSize: 12,
        color: '#333',
        fontWeight: '500',
    },
    legend: {
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendText: {
        fontSize: 11,
        color: '#333',
    },
    svgContainer: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    instructions: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    instructionText: {
        fontSize: 12,
        color: '#666',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    modalBackdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        flex: 1,
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        marginTop: 40,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    sub: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4,
    },
    section: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
        color: '#333',
    },
    row: {
        fontSize: 13,
        lineHeight: 22,
        color: '#444',
    },
    empty: {
        fontSize: 13,
        color: '#999',
        fontStyle: 'italic',
    },
    pathwayButton: {
        marginTop: 16,
        backgroundColor: '#1B5E20',
        borderRadius: 6,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 8,
    },
    pathwayButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    closeButton: {
        backgroundColor: '#0D47A1',
        borderRadius: 6,
        paddingVertical: 12,
        alignItems: 'center',
    },
    closeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
});

export default CareerConstellation;