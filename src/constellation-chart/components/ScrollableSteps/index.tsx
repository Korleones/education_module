import React, { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    Text,
    ScrollView,
    TouchableOpacity,
    Modal,
    ProgressBarAndroid,
    Platform,
    Alert
} from 'react-native';

// 1. 导入本地JSON数据（确保路径正确）
import mockUsersProgress from '../../../../assets/data/mock_users_progress.json';
import stemCareers from "../../../../assets/data/STEM Careers.json";
import skillsKnowledge from '../../../../assets/data/Skills and Knowledge years 3-10.json';

// 2. 类型定义与接口声明
interface UserSkill {
    level: number;
    name: string;
    description: string;
}

interface UserKnowledge {
    level: number;
    name: string;
    description: string;
}

interface UserProgress {
    skills: Record<string, UserSkill>;
    knowledge: Record<string, UserKnowledge>;
    careerInterests: string[];
}

interface CareerInfo {
    id: string;
    title: string;
    category: string;
}

interface CareerRequirement {
    minSkills: Record<string, number>;
    requiredKnowledge: Array<{ node: string; min_level: number; weight: number }>;
    careerInfo: CareerInfo;
}

interface CareerStep {
    stepId: string;
    type: 'SKILL' | 'KNOWLEDGE';
    title: string;
    careerId: string;
    careerTitle: string;
    order: number;
    content: {
        id: string;
        name: string;
        description: string;
        currentLevel: number;
        requiredLevel: number;
    };
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    progress: number;
}

interface CareerPath {
    careerId: string;
    careerTitle: string;
    careerCategory: string;
    totalSteps: number;
    completedSteps: number;
    progressRate: number;
    steps: CareerStep[];
}

interface ScrollableCareerStepsProps {
    userId: string;
    initialCareerId?: string;
}

// 3. 本地数据工具函数
const DataUtils = {
    getUserProgress: (userId: string): UserProgress => {
        const targetUser = mockUsersProgress.users.find(user => user.user_id === userId);
        if (!targetUser) throw new Error(`User ${userId} not found`);

        const userSkills: Record<string, UserSkill> = {};
        const skillStrands = skillsKnowledge.skills_progression;
        Object.entries(targetUser.skills_levels).forEach(([skillKey, level]) => {
            const keyMap = {
                'QP': 'Questioning & Predicting',
                'PC': 'Planning & Conducting',
                'PAD': 'Processing & Analysing Data',
                'EVAL': 'Evaluating',
                'COMM': 'Communicating'
            };
            // @ts-ignore
            const strandName = keyMap[skillKey];
            const matchedStrand = skillStrands.find(strand => strand.strand === strandName);
            userSkills[skillKey] = {
                level,
                name: strandName || skillKey,
                description: matchedStrand ? `Develop ${matchedStrand.strand.toLowerCase()} skills` : `Skill ${skillKey}`
            };
        });

        const userKnowledge: Record<string, UserKnowledge> = {};
        targetUser.knowledge_progress.forEach(know => {
            const matchedKnow = skillsKnowledge.disciplines.find(dis => dis.id === know.node);
            userKnowledge[know.node] = {
                level: know.level,
                name: matchedKnow ? matchedKnow.title : know.node,
                description: matchedKnow ? matchedKnow.description : `Knowledge node ${know.node}`
            };
        });

        return {
            skills: userSkills,
            knowledge: userKnowledge,
            careerInterests: targetUser.career_interests
        };
    },

    getCareerRequirements: (careerId: string): CareerRequirement => {
        console.log(`Looking for career: ${careerId}`);

        let targetCareer = stemCareers.careers.find(career => career.id === careerId);

        if (!targetCareer) {
            const numericId = careerId.replace('career.', '');
            targetCareer = stemCareers.careers.find(career => career.id === `career.${numericId}`);
        }

        if (!targetCareer) {
            const numericId = careerId.replace('career.', '');
            targetCareer = stemCareers.careers.find(career => {
                const careerNum = career.id.replace('career.', '');
                return careerNum === numericId;
            });
        }

        if (!targetCareer) {
            console.warn(`Career ${careerId} not found in available careers:`,
                stemCareers.careers.map(c => c.id));
            throw new Error(`Career ${careerId} not found`);
        }

        console.log(`Found career: ${targetCareer.id} - ${targetCareer.title}`);
        return {
            minSkills: targetCareer.min_skill_levels,
            requiredKnowledge: targetCareer.required_knowledge,
            careerInfo: {
                id: targetCareer.id,
                title: targetCareer.title,
                category: targetCareer.category
            }
        };
    }
};

// 4. 职业路径生成逻辑
const generateCareerPath = (userId: string, careerId: string): CareerPath => {
    try {
        console.log(`Generating path for user ${userId}, career ${careerId}`);
        const userProgress = DataUtils.getUserProgress(userId);
        const careerReq = DataUtils.getCareerRequirements(careerId);
        const { minSkills, requiredKnowledge, careerInfo } = careerReq;
        const { skills: userSkills, knowledge: userKnowledge } = userProgress;

        const skillSteps = Object.entries(minSkills).map(([skillKey, reqLevel], index) => {
            const userSkill = userSkills[skillKey];
            const currentLevel = userSkill ? userSkill.level : 0;
            let status: CareerStep['status'] = 'PENDING';
            let progress = 0;

            if (currentLevel >= reqLevel) {
                status = 'COMPLETED';
                progress = 1;
            } else if (currentLevel > 0) {
                status = 'IN_PROGRESS';
                progress = parseFloat((currentLevel / reqLevel).toFixed(2));
            }

            return {
                stepId: `${careerId}_SKILL_${index + 1}`,
                type: 'SKILL' as const,
                title: `Master ${userSkill?.name || skillKey} (Lv${reqLevel})`,
                careerId: careerInfo.id,
                careerTitle: careerInfo.title,
                order: index + 1,
                content: {
                    id: skillKey,
                    name: userSkill?.name || skillKey,
                    description: userSkill?.description || `Skill ${skillKey}`,
                    currentLevel,
                    requiredLevel: reqLevel
                },
                status,
                progress
            };
        }).sort((a, b) => a.content.requiredLevel - b.content.requiredLevel);

        const knowledgeSteps = requiredKnowledge.map((knowReq, index) => {
            const userKnow = userKnowledge[knowReq.node];
            const currentLevel = userKnow ? userKnow.level : 0;
            const stepOrder = skillSteps.length + index + 1;
            let status: CareerStep['status'] = 'PENDING';
            let progress = 0;

            if (currentLevel >= knowReq.min_level) {
                status = 'COMPLETED';
                progress = 1;
            } else if (currentLevel > 0) {
                status = 'IN_PROGRESS';
                progress = parseFloat((currentLevel / knowReq.min_level).toFixed(2));
            }

            return {
                stepId: `${careerId}_KNOW_${index + 1}`,
                type: 'KNOWLEDGE' as const,
                title: `Learn ${userKnow?.name || knowReq.node} (Lv${knowReq.min_level})`,
                careerId: careerInfo.id,
                careerTitle: careerInfo.title,
                order: stepOrder,
                content: {
                    id: knowReq.node,
                    name: userKnow?.name || knowReq.node,
                    description: userKnow?.description || `Knowledge ${knowReq.node}`,
                    currentLevel,
                    requiredLevel: knowReq.min_level
                },
                status,
                progress
            };
        }).sort((a, b) => {
            const weightA = requiredKnowledge.find(k => k.node === a.content.id)?.weight || 0;
            const weightB = requiredKnowledge.find(k => k.node === b.content.id)?.weight || 0;
            return weightB - weightA;
        });

        const allSteps = [...skillSteps, ...knowledgeSteps].sort((a, b) => a.order - b.order);
        const completedSteps = allSteps.filter(step => step.status === 'COMPLETED').length;

        return {
            careerId: careerInfo.id,
            careerTitle: careerInfo.title,
            careerCategory: careerInfo.category,
            totalSteps: allSteps.length,
            completedSteps,
            progressRate: allSteps.length > 0 ? parseFloat((completedSteps / allSteps.length).toFixed(2)) : 0,
            steps: allSteps
        };
    } catch (error) {
        console.error('Path generation error:', error);
        return {
            careerId,
            careerTitle: 'Unknown Career',
            careerCategory: 'Unknown',
            totalSteps: 0,
            completedSteps: 0,
            progressRate: 0,
            steps: []
        };
    }
};

const loadUserCareerPaths = (userId: string): CareerPath[] => {
    try {
        const userProgress = DataUtils.getUserProgress(userId);
        const paths = userProgress.careerInterests.map(careerId => {
            return generateCareerPath(userId, careerId);
        });

        const validPaths = paths.filter(path => path.steps.length > 0);
        return validPaths.sort((a, b) => b.progressRate - a.progressRate);
    } catch (error) {
        console.error('Load paths error:', error);
        return [];
    }
};

// 5. 可滚动步骤列表组件
const ScrollableCareerSteps: React.FC<ScrollableCareerStepsProps> = ({
                                                                         userId,
                                                                         initialCareerId,
                                                                     }) => {
    const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
    const [selectedPath, setSelectedPath] = useState<CareerPath | null>(null);
    const [selectedStep, setSelectedStep] = useState<CareerStep | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPaths = () => {
            try {
                setLoading(true);
                const paths = loadUserCareerPaths(userId);

                if (paths.length === 0) {
                    setError('No career paths found for this user');
                    setLoading(false);
                    return;
                }

                let initialPath: CareerPath;
                if (initialCareerId) {
                    initialPath = paths.find(p => p.careerId === initialCareerId) || paths[0];
                } else {
                    initialPath = paths[0];
                }

                setCareerPaths(paths);
                setSelectedPath(initialPath);
                setError('');
            } catch (err) {
                console.error('Fetch paths error:', err);
                // @ts-ignore
                setError(`Load failed: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchPaths();
    }, [userId, initialCareerId]);

    const getStepStyles = (step: CareerStep) => ({
        typeColor: step.type === 'SKILL' ? '#2196f3' : '#4caf50',
        statusColor:
            step.status === 'COMPLETED'
                ? '#4caf50'
                : step.status === 'IN_PROGRESS'
                    ? '#ff9800'
                    : '#ccc',
        progressColor:
            step.status === 'COMPLETED'
                ? '#4caf50'
                : step.status === 'IN_PROGRESS'
                    ? '#ff9800'
                    : '#eee',
        icon: step.type === 'SKILL' ? '⚙️' : '📚',
    });

    const handleMarkCompleted = () => {
        if (!selectedStep || !selectedPath) return;

        // 1. 更新当前步骤状态
        const updatedStep: CareerStep = {
            ...selectedStep,
            status: 'COMPLETED',
            progress: 1,
            content: {
                ...selectedStep.content,
                currentLevel: selectedStep.content.requiredLevel, // 同步当前等级为要求等级
            },
        };

        // 2. 更新选中路径的步骤列表
        const updatedSteps = selectedPath.steps.map(step =>
            step.stepId === selectedStep.stepId ? updatedStep : step
        );

        // 3. 重新计算路径整体进度
        const completedSteps = updatedSteps.filter(s => s.status === 'COMPLETED').length;
        const progressRate = parseFloat((completedSteps / updatedSteps.length).toFixed(2));

        // 4. 更新选中路径状态
        const updatedPath: CareerPath = {
            ...selectedPath,
            steps: updatedSteps,
            completedSteps,
            progressRate,
        };

        // 5. 更新路径列表中的对应路径（保持列表同步）
        const updatedCareerPaths = careerPaths.map(path =>
            path.careerId === selectedPath.careerId ? updatedPath : path
        );

        // 6. 同步所有状态更新
        setSelectedStep(updatedStep);
        setSelectedPath(updatedPath);
        setCareerPaths(updatedCareerPaths);

        Alert.alert('Success', `Step "${selectedStep.title}" marked as completed!`);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading career paths...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => {
                        setLoading(true);
                        setError('');
                        setTimeout(() => {
                            const paths = loadUserCareerPaths(userId);
                            if (paths.length > 0) {
                                setCareerPaths(paths);
                                setSelectedPath(paths[0]);
                            } else {
                                setError('No career paths found after retry');
                            }
                            setLoading(false);
                        }, 500);
                    }}
                >
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (careerPaths.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                    No career interests found. Update mock_users_progress.json.
                </Text>
            </View>
        );
    }

    if (selectedPath?.steps.length > 0) {
        return (
            <View style={styles.container}>
                <ScrollView
                    horizontal
                    style={styles.pathTabContainer}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pathTabContent}
                >
                    {careerPaths.map(path => {
                        const isActive = selectedPath?.careerId === path.careerId;
                        return (
                            <TouchableOpacity
                                key={path.careerId}
                                style={[styles.pathTab, isActive && styles.activePathTab]}
                                onPress={() => setSelectedPath(path)}
                            >
                                <Text
                                    style={[
                                        styles.pathTabTitle,
                                        isActive && styles.activePathTabTitle,
                                    ]}
                                >
                                    {path.careerTitle.length > 12
                                        ? `${path.careerTitle.slice(0, 12)}…`
                                        : path.careerTitle}
                                </Text>
                                <View
                                    style={[
                                        styles.pathProgress,
                                        isActive && styles.activePathProgress,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.pathProgressText,
                                            isActive && styles.activePathProgressText,
                                        ]}
                                    >
                                        {Math.round(path.progressRate * 100)}%
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <ScrollView
                    style={styles.stepsScrollView}
                    showsVerticalScrollIndicator={true}
                >
                    {selectedPath?.steps.map(step => {
                        const stepStyles = getStepStyles(step);
                        return (
                            <TouchableOpacity
                                key={step.stepId}
                                style={styles.stepCard}
                                onPress={() => setSelectedStep(step)}
                            >
                                <View
                                    style={[
                                        styles.stepIcon,
                                        { backgroundColor: stepStyles.statusColor },
                                    ]}
                                >
                                    <Text style={styles.iconText}>{stepStyles.icon}</Text>
                                    <Text style={styles.stepOrder}>{step.order}</Text>
                                </View>

                                <View style={styles.stepContent}>
                                    <Text style={styles.stepTitle}>{step.title}</Text>
                                    <Text style={styles.stepDesc} numberOfLines={2}>
                                        {step.content.description}
                                    </Text>

                                    <View style={styles.progressContainer}>
                                        <Text style={styles.progressText}>
                                            Progress: {Math.round(step.progress * 100)}% (Lv
                                            {step.content.currentLevel}/{step.content.requiredLevel})
                                        </Text>
                                        {Platform.OS === 'android' ? (
                                            <ProgressBarAndroid
                                                styleAttr="Horizontal"
                                                progress={step.progress}
                                                color={stepStyles.progressColor}
                                                style={styles.progressBar}
                                            />
                                        ) : (
                                            <View style={styles.iosProgressBar}>
                                                <View
                                                    style={[
                                                        styles.iosProgressFill,
                                                        {
                                                            width: `${step.progress * 100}%`,
                                                            backgroundColor: stepStyles.progressColor,
                                                        },
                                                    ]}
                                                />
                                            </View>
                                        )}
                                    </View>

                                    <View
                                        style={[
                                            styles.statusBadge,
                                            { backgroundColor: stepStyles.statusColor },
                                        ]}
                                    >
                                        <Text style={styles.statusText}>
                                            {step.status === 'COMPLETED'
                                                ? 'Completed'
                                                : step.status === 'IN_PROGRESS'
                                                    ? 'In Progress'
                                                    : 'Pending'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <Modal
                    visible={!!selectedStep}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setSelectedStep(null)}
                >
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalCard}>
                            {selectedStep && (
                                <>
                                    <Text style={styles.modalTitle}>
                                        Step {selectedStep.order}: {selectedStep.title}
                                    </Text>
                                    <Text style={styles.modalSubtitle}>
                                        Target: {selectedStep.careerTitle}
                                    </Text>

                                    <View style={styles.modalDetailSection}>
                                        <Text style={styles.modalDetailTitle}>Step Info</Text>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Type:</Text>
                                            <Text style={styles.detailValue}>
                                                {selectedStep.type === 'SKILL'
                                                    ? 'Skill Improvement'
                                                    : 'Knowledge Learning'}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Current Level:</Text>
                                            <Text style={styles.detailValue}>
                                                Lv{selectedStep.content.currentLevel}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Required Level:</Text>
                                            <Text style={styles.detailValue}>
                                                Lv{selectedStep.content.requiredLevel}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Status:</Text>
                                            <Text
                                                style={[
                                                    styles.detailValue,
                                                    { color: getStepStyles(selectedStep).statusColor },
                                                ]}
                                            >
                                                {selectedStep.status}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalDescSection}>
                                        <Text style={styles.modalDetailTitle}>Description</Text>
                                        <Text style={styles.modalDescText}>
                                            {selectedStep.content.description}
                                        </Text>
                                    </View>

                                    {selectedStep.status !== 'COMPLETED' && (
                                        <TouchableOpacity
                                            style={styles.completeBtn}
                                            onPress={handleMarkCompleted}
                                        >
                                            <Text style={styles.completeBtnText}>
                                                Mark as Completed
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={styles.closeBtn}
                                        onPress={() => setSelectedStep(null)}
                                    >
                                        <Text style={styles.closeBtnText}>Close</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
        );
    } else {
        return (
            <View style={styles.container}>
                <ScrollView
                    horizontal
                    style={styles.pathTabContainer}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pathTabContent}
                >
                    {careerPaths.map(path => {
                        const isActive = selectedPath?.careerId === path.careerId;
                        return (
                            <TouchableOpacity
                                key={path.careerId}
                                style={[styles.pathTab, isActive && styles.activePathTab]}
                                onPress={() => setSelectedPath(path)}
                            >
                                <Text
                                    style={[
                                        styles.pathTabTitle,
                                        isActive && styles.activePathTabTitle,
                                    ]}
                                >
                                    {path.careerTitle.length > 12
                                        ? `${path.careerTitle.slice(0, 12)}…`
                                        : path.careerTitle}
                                </Text>
                                <View
                                    style={[
                                        styles.pathProgress,
                                        isActive && styles.activePathProgress,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.pathProgressText,
                                            isActive && styles.activePathProgressText,
                                        ]}
                                    >
                                        {Math.round(path.progressRate * 100)}%
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <ScrollView
                    style={styles.stepsScrollView}
                    showsVerticalScrollIndicator={true}
                >
                    <View style={styles.emptyStepsContainer}>
                        <Text style={styles.emptyStepsText}>
                            No steps for this career.
                        </Text>
                        <Text style={styles.emptyStepsSubtext}>
                            This may be due to data format issues.
                        </Text>
                    </View>
                </ScrollView>

                <Modal
                    visible={!!selectedStep}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setSelectedStep(null)}
                >
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalCard}>
                            {selectedStep && (
                                <>
                                    <Text style={styles.modalTitle}>
                                        Step {selectedStep.order}: {selectedStep.title}
                                    </Text>
                                    <Text style={styles.modalSubtitle}>
                                        Target: {selectedStep.careerTitle}
                                    </Text>

                                    <View style={styles.modalDetailSection}>
                                        <Text style={styles.modalDetailTitle}>Step Info</Text>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Type:</Text>
                                            <Text style={styles.detailValue}>
                                                {selectedStep.type === 'SKILL'
                                                    ? 'Skill Improvement'
                                                    : 'Knowledge Learning'}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Current Level:</Text>
                                            <Text style={styles.detailValue}>
                                                Lv{selectedStep.content.currentLevel}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Required Level:</Text>
                                            <Text style={styles.detailValue}>
                                                Lv{selectedStep.content.requiredLevel}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Status:</Text>
                                            <Text
                                                style={[
                                                    styles.detailValue,
                                                    { color: getStepStyles(selectedStep).statusColor },
                                                ]}
                                            >
                                                {selectedStep.status}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalDescSection}>
                                        <Text style={styles.modalDetailTitle}>Description</Text>
                                        <Text style={styles.modalDescText}>
                                            {selectedStep.content.description}
                                        </Text>
                                    </View>

                                    {selectedStep.status !== 'COMPLETED' && (
                                        <TouchableOpacity
                                            style={styles.completeBtn}
                                            onPress={handleMarkCompleted}
                                        >
                                            <Text style={styles.completeBtnText}>
                                                Mark as Completed
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={styles.closeBtn}
                                        onPress={() => setSelectedStep(null)}
                                    >
                                        <Text style={styles.closeBtnText}>Close</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f7f7',
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    pathTabContainer: {
        marginBottom: 16,
        height: 80,
    },
    pathTabContent: {
        paddingRight: 16,
    },
    pathTab: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginRight: 12,
        minWidth: 120,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    activePathTab: {
        backgroundColor: '#2196f3',
    },
    pathTabTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    activePathTabTitle: {
        color: '#fff',
    },
    pathProgress: {
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    activePathProgress: {
        backgroundColor: '#e3f2fd',
    },
    pathProgressText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    activePathProgressText: {
        color: '#fff',
    },
    stepsScrollView: {
        flex: 1,
    },
    stepCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    stepIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconText: {
        fontSize: 20,
        color: '#fff',
    },
    stepOrder: {
        fontSize: 12,
        color: '#fff',
        fontWeight: 'bold',
        marginTop: 2,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    stepDesc: {
        fontSize: 13,
        color: '#666',
        marginBottom: 8,
        lineHeight: 18,
    },
    progressContainer: {
        marginBottom: 8,
    },
    progressText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
    },
    iosProgressBar: {
        height: 8,
        backgroundColor: '#eee',
        borderRadius: 4,
        overflow: 'hidden',
    },
    iosProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#f44336',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryBtn: {
        backgroundColor: '#2196f3',
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    retryText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    },
    emptyStepsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyStepsText: {
        fontSize: 16,
        color: '#999',
        marginBottom: 8,
    },
    emptyStepsSubtext: {
        fontSize: 14,
        color: '#ccc',
        textAlign: 'center',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    modalCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    modalDetailSection: {
        marginBottom: 16,
    },
    modalDetailTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 6,
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
        width: 110,
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
    },
    modalDescSection: {
        marginBottom: 20,
    },
    modalDescText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    completeBtn: {
        backgroundColor: '#4caf50',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    completeBtnText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    closeBtn: {
        backgroundColor: '#2196f3',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    closeBtnText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
});

export default ScrollableCareerSteps;