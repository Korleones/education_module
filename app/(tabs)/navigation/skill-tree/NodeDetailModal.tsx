import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { NodeStatus, TreeNode } from './types';

// ------------------------------------------------------
// Node type definitions (replace with your actual types)
// ------------------------------------------------------
interface DisciplineLevel {
  level: number;
  outcomes: string[];
}

interface DisciplineTreeNode {
  nodeType: 'discipline';
  status: NodeStatus;
  title: string;
  discipline: string;
  code: string;
  description: string;
  year: number;
  currentLevel: number;
  levels: DisciplineLevel[];
  reinforced_by?: string[];
  progression_to?: string;
}

interface SkillTreeNodeWithData {
  nodeType: 'skill';
  status: NodeStatus;
  title: string;
  skillCode: string;
  skillName: string;
  description: string;
  year: number;
  level: number;
}



interface NodeDetailModalProps {
  visible: boolean;
  node: TreeNode | null;
  onClose: () => void;
  onStatusChange: (status: NodeStatus, level: number) => void;
}

// ------------------------------------------------------
// Safe typed status labels & colors
// Completely solves: “Element implicitly has an 'any' type...”
// ------------------------------------------------------
const statusLabels: Record<NodeStatus, string> = {
  locked: 'Locked',
  available: 'Available',
  'in-progress': 'In Progress',
  earned: 'Earned',
};

const statusColors: Record<NodeStatus, string> = {
  locked: '#9E9E9E',
  available: '#2196F3',
  'in-progress': '#FF9800',
  earned: '#4CAF50',
};

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  visible,
  node,
  onClose,
  onStatusChange,
}) => {
  if (!node) return null;

  const statuses: NodeStatus[] = [
    'locked',
    'available',
    'in-progress',
    'earned',
  ];

  const isDisciplineNode = node.nodeType === 'discipline';
  const isSkillNode = node.nodeType === 'skill';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: statusColors[node.status] },
              ]}
            >
              <Text style={styles.iconText}>
                {isDisciplineNode
                  ? node.discipline.charAt(0)
                  : node.skillCode}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{node.title}</Text>

            {/* Status section */}
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColors[node.status] },
                ]}
              >
                <Text style={styles.statusText}>
                  {statusLabels[node.status]}
                </Text>
              </View>

              <View style={styles.yearBadge}>
                <Text style={styles.yearText}>
                  {isDisciplineNode
                    ? `Year ${node.year}`
                    : `Level ${node.level}`}
                </Text>
              </View>

              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor: isDisciplineNode
                      ? '#673AB7'
                      : '#FF5722',
                  },
                ]}
              >
                <Text style={styles.typeText}>
                  {isDisciplineNode ? 'Discipline' : 'Skill'}
                </Text>
              </View>
            </View>

            {/* Discipline node details */}
            {isDisciplineNode && (
              <>
                {/* Discipline */}
                <View style={styles.section}>
                  <Text style={styles.label}>Discipline:</Text>
                  <Text style={styles.value}>{node.discipline}</Text>
                </View>

                {/* Code */}
                <View style={styles.section}>
                  <Text style={styles.label}>Code:</Text>
                  <Text style={styles.value}>{node.code}</Text>
                </View>

                {/* Description */}
                <View style={styles.section}>
                  <Text style={styles.label}>Description:</Text>
                  <Text style={styles.description}>{node.description}</Text>
                </View>

                {/* Learning levels */}
                <View style={styles.section}>
                  <Text style={styles.label}>Learning Levels:</Text>
                  {node.levels.map((lvl, index) => (
                    <View
                      key={index}
                      style={[
                        styles.levelContainer,
                        node.currentLevel === lvl.level &&
                          styles.currentLevelContainer,
                      ]}
                    >
                      <Text style={styles.levelTitle}>
                        Level {lvl.level}:
                      </Text>
                      {lvl.outcomes.map((out, i) => (
                        <Text key={i} style={styles.outcome}>
                          • {out}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>

                {/* Progress bar */}
                {(node.status === 'in-progress' ||
                  node.status === 'earned') &&
                  node.currentLevel!=undefined && (
                    <View style={styles.section}>
                      <Text style={styles.label}>Progress:</Text>
                      <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${(node.currentLevel / 3) * 100}%`,
                                backgroundColor: statusColors[node.status],
                              },
                            ]}
                          />
                        </View>

                        <Text style={styles.progressPercentage}>
                          Level {node.currentLevel}/3
                        </Text>
                      </View>
                    </View>
                  )}

                {/* Required skills */}
                {node.reinforced_by &&
                  node.reinforced_by.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.label}>Required Skills:</Text>
                      {node.reinforced_by.map((skill, i) => (
                        <Text key={i} style={styles.reinforcedBy}>
                          • {skill}
                        </Text>
                      ))}
                    </View>
                  )}

                {/* Progression */}
                {node.progression_to && (
                  <View style={styles.section}>
                    <Text style={styles.label}>Progresses To:</Text>
                    <Text style={styles.value}>
                      {node.progression_to}
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Skill node details */}
            {isSkillNode && (
              <>
                <View style={styles.section}>
                  <Text style={styles.label}>Skill Code:</Text>
                  <Text style={styles.value}>{node.skillCode}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Skill Name:</Text>
                  <Text style={styles.value}>{node.skillName}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Year Level:</Text>
                  <Text style={styles.value}>
                    Year {node.year} (Level {node.level})
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Description:</Text>
                  <Text style={styles.description}>{node.description}</Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    💡 Completing this skill unlocks related discipline
                    courses.
                  </Text>
                </View>
              </>
            )}

            {/* Status changing buttons */}
            <View style={styles.section}>
              <Text style={styles.label}>Change Status:</Text>

              <View style={styles.statusButtons}>
                {statuses.map((status) => {
                  const isActive = node.status === status;

                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        { borderColor: statusColors[status] },
                        isActive && {
                          backgroundColor: statusColors[status],
                        },
                      ]}
                      onPress={() => {
                        const level =
                          status === 'earned'
                            ? isDisciplineNode
                              ? 3
                              : node.level
                            : status === 'in-progress'
                            ? 1
                            : 0;

                        onStatusChange(status, level);
                      }}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          isActive && styles.statusButtonTextActive,
                        ]}
                      >
                        {statusLabels[status]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Discipline: manual level selector */}
            {isDisciplineNode &&
              (node.status === 'in-progress' ||
                node.status === 'earned') && (
                <View style={styles.section}>
                  <Text style={styles.label}>Set Level:</Text>

                  <View style={styles.levelButtons}>
                    {[1, 2, 3].map((lvl) => {
                      const isActive = node.currentLevel === lvl;

                      return (
                        <TouchableOpacity
                          key={lvl}
                          style={[
                            styles.levelButton,
                            isActive && styles.levelButtonActive,
                          ]}
                          onPress={() => {
                            const newStatus =
                              lvl >= 3 ? 'earned' : 'in-progress';
                            onStatusChange(newStatus, lvl);
                          }}
                        >
                          <Text
                            style={[
                              styles.levelButtonText,
                              isActive && styles.levelButtonTextActive,
                            ]}
                          >
                            Level {lvl}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ------------------------------------------------------
// Styles
// ------------------------------------------------------
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  iconText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 28,
    color: '#999',
    fontWeight: '300',
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    opacity: 0.8,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  description: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  levelContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  currentLevelContainer: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  outcome: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
    paddingLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  yearBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  yearText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: 'white',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  statusButtonTextActive: {
    color: 'white',
  },
  levelButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  levelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  levelButtonTextActive: {
    color: 'white',
  },
  reinforcedBy: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 20,
  },
});

