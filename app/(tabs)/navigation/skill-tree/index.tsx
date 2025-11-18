import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from "@react-navigation/native";

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  PanResponder,
  Platform
} from 'react-native';

import { SkillTreeVisualizer } from './SkillTreeVisualizer';
import { NodeDetailModal } from './NodeDetailModal';

import {
  DisciplineNode,
  SkillNode,
  SkillsData,
  UserData,
  NodeStatus,
  DisciplineTreeNode,
  SkillTreeNodeWithData,
  TreeNode
} from './types';

import {
  generateSkillNodes,
  calculateDisciplineNodeStatus,
  calculateSkillNodeStatus,
  calculateLayout,
  updateNodeStatusAndRecalculate
} from './utils';

import { loadSelectedStudent } from '../../../../utils/storage';
import skillsData from '../../../../assets/data/Skills and Knowledge years 3-10.json';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SkillTreePage() {
  //loading status
  const [loading, setLoading] = useState(true);
  //discipline nodes
  const [disciplineNodes, setDisciplineNodes] = useState<DisciplineTreeNode[]>([]);
  const [skillNodes, setSkillNodes] = useState<SkillTreeNodeWithData[]>([]);

  const [allDisciplines, setAllDisciplines] = useState<DisciplineNode[]>([]);
  const [allSkills, setAllSkills] = useState<SkillNode[]>([]);

  const [userData, setUserData] = useState<UserData | null>(null);

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [scale, setScale] = useState(0.6);
  const [panX, setPanX] = useState(20);
  const [panY, setPanY] = useState(50);

  const lastPanX = useRef(20);
  const lastPanY = useRef(50);

  // --------------------------------------------------
  // 🔥 Smooth wheel zoom (web only)
  // --------------------------------------------------
  const handleWheelZoom = (e: WheelEvent) => {
    if (Platform.OS !== 'web') return;

    const delta = e.deltaY;
    const zoomFactor = 1 + (-delta * 0.0015); // smooth zoom

    setScale(prev => {
      const next = prev * zoomFactor;
      return Math.max(0.3, Math.min(3, next)); // clamp zoom
    });
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.addEventListener("wheel", handleWheelZoom, { passive: true });
      return () => window.removeEventListener("wheel", handleWheelZoom);
    }
  }, []);
  // --------------------------------------------------
useFocusEffect(
  React.useCallback(() => {
    initializeData();  // 每次页面重新获得焦点时刷新学生 + 节点
  }, [])
);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const data = skillsData as unknown as SkillsData;

      const currentUser = await loadSelectedStudent();
      if (!currentUser) {
        console.error('No student selected');
        setLoading(false);
        return;
      }

      setUserData(currentUser);

      const generatedSkillNodes = generateSkillNodes();
      setAllSkills(generatedSkillNodes);

      const disciplinesWithType: DisciplineNode[] = data.disciplines.map(d => ({
        ...d,
        type: 'discipline'
      }));

      setAllDisciplines(disciplinesWithType);

      const positions = calculateLayout(disciplinesWithType, generatedSkillNodes);

      const disciplineTree: DisciplineTreeNode[] = disciplinesWithType.map(d => {
        const { status, currentLevel } = calculateDisciplineNodeStatus(
          d,
          currentUser,
          disciplinesWithType,
          generatedSkillNodes
        );

        return {
          ...d,
          nodeType: 'discipline',
          status,
          currentLevel,
          position: positions.get(d.id) || { x: 0, y: 0 }
        };
      });

      const skillTree: SkillTreeNodeWithData[] = generatedSkillNodes.map(s => {
        const { status, currentLevel } = calculateSkillNodeStatus(s, currentUser);

        return {
          ...s,
          nodeType: 'skill',
          status,
          currentLevel,
          position: positions.get(s.id) || { x: 0, y: 0 }
        };
      });

      setDisciplineNodes(disciplineTree);
      setSkillNodes(skillTree);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const recalculateAllNodes = (updatedUserData: UserData) => {
    const positions = calculateLayout(allDisciplines, allSkills);

    const updatedDisciplines: DisciplineTreeNode[] = allDisciplines.map(d => {
      const { status, currentLevel } = calculateDisciplineNodeStatus(
        d,
        updatedUserData,
        allDisciplines,
        allSkills
      );

      return {
        ...d,
        nodeType: 'discipline',
        status,
        currentLevel,
        position: positions.get(d.id) || { x: 0, y: 0 }
      };
    });

    const updatedSkills: SkillTreeNodeWithData[] = allSkills.map(s => {
      const { status, currentLevel } = calculateSkillNodeStatus(s, updatedUserData);

      return {
        ...s,
        nodeType: 'skill',
        status,
        currentLevel,
        position: positions.get(s.id) || { x: 0, y: 0 }
      };
    });

    setDisciplineNodes(updatedDisciplines);
    setSkillNodes(updatedSkills);
  };

  const handleNodePress = (node: TreeNode) => {
    setSelectedNode(node);
    setModalVisible(true);
  };

  const handleStatusChange = (status: NodeStatus, level: number) => {
    if (!selectedNode || !userData) return;

    const updatedUser = updateNodeStatusAndRecalculate(
      selectedNode.id,
      status,
      level,
      userData,
      allDisciplines,
      allSkills
    );

    setUserData(updatedUser);
    recalculateAllNodes(updatedUser);

    const allNodes = [...disciplineNodes, ...skillNodes];
    const updatedNode = allNodes.find(n => n.id === selectedNode.id);
    if (updatedNode) setSelectedNode(updatedNode);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastPanX.current = panX;
        lastPanY.current = panY;
      },
      onPanResponderMove: (e, g) => {
        setPanX(lastPanX.current + g.dx);
        setPanY(lastPanY.current + g.dy);
      }
    })
  ).current;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading Skill Tree...</Text>
      </View>
    );
  }

  const allTreeNodes: TreeNode[] = [...disciplineNodes, ...skillNodes];

  return (

    
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push('/navigation')}
      >
        <Ionicons name="chevron-back" size={22} color="#333" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity> 


      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Skill Tree</Text>
        {userData && (
          <View style={styles.userInfo}>
            <Text style={styles.userText}>Student: {userData.user_id}</Text>
            <Text style={styles.userText}>Year {userData.year}</Text>
            <Text style={styles.userText}>
              {disciplineNodes.length} Disciplines + {skillNodes.length} Skills
            </Text>
          </View>
        )}
      </View>

      <View style={styles.visualizerContainer} {...panResponder.panHandlers}>
        <SkillTreeVisualizer
          disciplineNodes={disciplineNodes}
          skillNodes={skillNodes}
          allDisciplines={allDisciplines}
          allSkills={allSkills}
          onNodePress={handleNodePress}
          scale={scale}
          panX={panX}
          panY={panY}
        />
      </View>

      <NodeDetailModal
        visible={modalVisible}
        node={selectedNode}
        onClose={() => setModalVisible(false)}
        onStatusChange={handleStatusChange}
      />

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {allTreeNodes.filter(n => n.status === 'earned').length}
          </Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {allTreeNodes.filter(n => n.status === 'in-progress').length}
          </Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {allTreeNodes.filter(n => n.status === 'available').length}
          </Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {allTreeNodes.filter(n => n.status === 'locked').length}
          </Text>
          <Text style={styles.statLabel}>Locked</Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  header: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', paddingHorizontal: 100 },
  userInfo: { flexDirection: 'row', marginTop: 10, gap: 20 },
  userText: { fontSize: 14, color: '#666' },
  visualizerContainer: { flex: 1 },
  stats: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    justifyContent: 'space-around'
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#666' },
   backButton: {
    position: 'absolute',
    top: 20, // Close to top safe area
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3, // Android shadow
    zIndex: 10,
  },
  backText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 2,
    fontWeight: '500',
  },
});
