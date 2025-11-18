import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Defs, LinearGradient, Stop, Marker, Path, Rect } from 'react-native-svg';
import { DisciplineTreeNode, SkillTreeNodeWithData, DisciplineNode, SkillNode } from './types';
import { 
  getNodeColor, 
  getDisciplineAbbreviation, 
  getSkillInfo,
  getAllConnections 
} from './utils';

interface SkillTreeVisualizerProps {
  disciplineNodes: DisciplineTreeNode[];
  skillNodes: SkillTreeNodeWithData[];
  allDisciplines: DisciplineNode[];
  allSkills: SkillNode[];
  onNodePress: (node: any) => void;
  scale: number;
  panX: number;
  panY: number;
}

export const SkillTreeVisualizer: React.FC<SkillTreeVisualizerProps> = ({
  disciplineNodes,
  skillNodes,
  allDisciplines,
  allSkills,
  onNodePress,
  scale,
  panX,
  panY
}) => {
  const { width, height } = Dimensions.get('window');

  // 计算所有连接
  const connections = useMemo(() => {
    const positionsMap = new Map<string, { x: number; y: number }>();
    
    disciplineNodes.forEach(n => positionsMap.set(n.id, n.position));
    skillNodes.forEach(n => positionsMap.set(n.id, n.position));
    
    return getAllConnections(allDisciplines, allSkills, positionsMap);
  }, [disciplineNodes, skillNodes, allDisciplines, allSkills]);

  // 渲染连接线
  const renderConnections = () => {
    const allNodes = [...disciplineNodes, ...skillNodes];
    
    return connections.map((conn, index) => {
      const sourceNode = allNodes.find(n => n.id === conn.from);
      const targetNode = allNodes.find(n => n.id === conn.to);
      
      if (!sourceNode || !targetNode) return null;

      const nodeRadius = 25;
      const dx = targetNode.position.x - sourceNode.position.x;
      const dy = targetNode.position.y - sourceNode.position.y;
      const angle = Math.atan2(dy, dx);
      
      const x1 = sourceNode.position.x + Math.cos(angle) * nodeRadius;
      const y1 = sourceNode.position.y + Math.sin(angle) * nodeRadius;
      const x2 = targetNode.position.x - Math.cos(angle) * nodeRadius;
      const y2 = targetNode.position.y - Math.sin(angle) * nodeRadius;
      
      // 根据连接类型设置样式
      let strokeColor = '#CCCCCC';
      let strokeWidth = 2;
      let strokeDasharray = '5,5';
      let opacity = 0.3;
      let markerEnd = 'url(#arrowDefault)';
      
      if (conn.type === 'progression') {
        // 学科进阶关系：蓝色实线
        strokeColor = targetNode.status === 'earned' ? '#4CAF50' : '#2196F3';
        strokeWidth = targetNode.status === 'earned' ? 3 : 2.5;
        strokeDasharray = '0';
        opacity = 0.6;
        markerEnd = targetNode.status === 'earned' ? 'url(#arrowCompleted)' : 'url(#arrowProgression)';
      } else if (conn.type === 'reinforcement') {
        // 技能强化关系：橙色虚线
        strokeColor = '#FF9800';
        strokeWidth = 1.5;
        strokeDasharray = '4,4';
        opacity = 0.4;
        markerEnd = 'url(#arrowReinforcement)';
      } else if (conn.type === 'skill-chain') {
        // 技能链：紫色实线
        strokeColor = '#9C27B0';
        strokeWidth = 2;
        strokeDasharray = '0';
        opacity = 0.5;
        markerEnd = 'url(#arrowSkillChain)';
      }

      return (
        <Line
          key={`line-${index}-${conn.from}-${conn.to}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeOpacity={opacity}
          strokeDasharray={strokeDasharray}
          markerEnd={markerEnd}
        />
      );
    });
  };

  // 渲染学科节点
  const renderDisciplineNode = (node: DisciplineTreeNode) => {
    const nodeColor = getNodeColor(node.status);
    const abbreviation = getDisciplineAbbreviation(node.discipline);
    const yearStr = `Y${node.year}`;
    const isLocked = node.status === 'locked';
    const isInProgress = node.status === 'in-progress';
    const isEarned = node.status === 'earned';

    return (
      <G key={node.id}>
        {/* 进行中的外环 */}
        {isInProgress && (
          <Circle
            cx={node.position.x}
            cy={node.position.y}
            r={34}
            fill="none"
            stroke={nodeColor}
            strokeWidth={2.5}
            opacity={0.5}
          />
        )}

        {/* 阴影 */}
        <Circle
          cx={node.position.x}
          cy={node.position.y + 2}
          r={25}
          fill="rgba(0, 0, 0, 0.15)"
          opacity={isLocked ? 0.3 : 0.5}
        />

        {/* 主节点 */}
        <Circle
          cx={node.position.x}
          cy={node.position.y}
          r={25}
          fill={nodeColor}
          opacity={isLocked ? 0.5 : 1}
          stroke="#FFFFFF"
          strokeWidth={2}
          onPress={() => onNodePress({ ...node, nodeType: 'discipline' })}
        />

        {/* 进度环 */}
        {isInProgress && node.currentLevel && (
          <Circle
            cx={node.position.x}
            cy={node.position.y}
            r={21}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={3}
            strokeDasharray={`${(node.currentLevel / 3) * (2 * Math.PI * 21)} ${2 * Math.PI * 21}`}
            strokeLinecap="round"
            opacity={0.8}
          />
        )}

        {/* 状态图标 */}
        {isEarned && (
          <SvgText
            x={node.position.x}
            y={node.position.y + 8}
            fontSize="24"
            fill="#FFFFFF"
            textAnchor="middle"
            fontWeight="bold"
            onPress={() => onNodePress({ ...node, nodeType: 'discipline' })}
          >
            ✓
          </SvgText>
        )}

        {isLocked && (
          <SvgText
            x={node.position.x}
            y={node.position.y + 6}
            fontSize="16"
            fill="#FFFFFF"
            textAnchor="middle"
            onPress={() => onNodePress({ ...node, nodeType: 'discipline' })}
          >
            🔒
          </SvgText>
        )}

        {(node.status === 'available' || node.status === 'in-progress') && (
          <>
            <SvgText
              x={node.position.x}
              y={node.position.y - 2}
              fontSize={11}
              fontWeight="bold"
              fill="white"
              textAnchor="middle"
              onPress={() => onNodePress({ ...node, nodeType: 'discipline' })}
            >
              {abbreviation}
            </SvgText>
            <SvgText
              x={node.position.x}
              y={node.position.y + 10}
              fontSize={9}
              fill="white"
              textAnchor="middle"
              onPress={() => onNodePress({ ...node, nodeType: 'discipline' })}
            >
              {yearStr}
            </SvgText>
          </>
        )}

        {/* 标题 */}
        <SvgText
          x={node.position.x}
          y={node.position.y + 42}
          fontSize={10}
          fill="#333333"
          textAnchor="middle"
          fontWeight="500"
        >
          {node.title.length > 12
            ? node.title.substring(0, 12) + '...'
            : node.title}
        </SvgText>

        {/* 等级显示 */}
        {node.currentLevel && (
          <SvgText
            x={node.position.x}
            y={node.position.y + 54}
            fontSize={9}
            fill={nodeColor}
            textAnchor="middle"
            fontWeight="bold"
          >
            Lv.{node.currentLevel}/3
          </SvgText>
        )}
      </G>
    );
  };

  // 渲染技能节点
  const renderSkillNode = (node: SkillTreeNodeWithData) => {
    const nodeColor = getNodeColor(node.status);
    const { abbr, icon } = getSkillInfo(node.skillCode);
    const isLocked = node.status === 'locked';
    const isEarned = node.status === 'earned';

    return (
      <G key={node.id}>
        {/* 阴影 */}
        <Rect
          x={node.position.x - 22}
          y={node.position.y - 18 + 2}
          width={44}
          height={36}
          rx={8}
          fill="rgba(0, 0, 0, 0.15)"
          opacity={isLocked ? 0.3 : 0.5}
        />

        {/* 主节点 - 圆角矩形 */}
        <Rect
          x={node.position.x - 22}
          y={node.position.y - 18}
          width={44}
          height={36}
          rx={8}
          fill={nodeColor}
          opacity={isLocked ? 0.5 : 1}
          stroke="#FFFFFF"
          strokeWidth={2}
          onPress={() => onNodePress({ ...node, nodeType: 'skill' })}
        />

        {/* 技能图标和缩写 */}
        <SvgText
          x={node.position.x}
          y={node.position.y - 4}
          fontSize={12}
          fill="#FFFFFF"
          textAnchor="middle"
          fontWeight="bold"
          onPress={() => onNodePress({ ...node, nodeType: 'skill' })}
        >
          {icon}
        </SvgText>
        
        <SvgText
          x={node.position.x}
          y={node.position.y + 10}
          fontSize={8}
          fill="#FFFFFF"
          textAnchor="middle"
          fontWeight="600"
          onPress={() => onNodePress({ ...node, nodeType: 'skill' })}
        >
          {abbr} L{node.level}
        </SvgText>

        {/* 完成标记 */}
        {isEarned && (
          <Circle
            cx={node.position.x + 16}
            cy={node.position.y - 12}
            r={6}
            fill="#4CAF50"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
        )}
      </G>
    );
  };

  return (
    <View style={styles.container}>
      <Svg width={width} height={height - 100} style={styles.svg}>
        <Defs>
          {/* 箭头标记 */}
          <Marker
            id="arrowCompleted"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <Path d="M0,0 L0,6 L8,3 z" fill="#4CAF50" />
          </Marker>
          
          <Marker
            id="arrowProgression"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <Path d="M0,0 L0,6 L8,3 z" fill="#2196F3" />
          </Marker>
          
          <Marker
            id="arrowReinforcement"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <Path d="M0,0 L0,6 L8,3 z" fill="#FF9800" />
          </Marker>
          
          <Marker
            id="arrowSkillChain"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <Path d="M0,0 L0,6 L8,3 z" fill="#9C27B0" />
          </Marker>
          
          <Marker
            id="arrowDefault"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <Path d="M0,0 L0,6 L8,3 z" fill="#CCCCCC" />
          </Marker>
        </Defs>

        <G transform={`translate(${panX}, ${panY}) scale(${scale})`}>
          {/* 渲染连接线 */}
          {renderConnections()}

          {/* 渲染技能节点（左侧）*/}
          {skillNodes.map(node => renderSkillNode(node))}

          {/* 渲染学科节点（右侧）*/}
          {disciplineNodes.map(node => renderDisciplineNode(node))}
        </G>
      </Svg>

      {/* 图例 */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Earned</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>In Progress</Text>
          </View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#9E9E9E' }]} />
            <Text style={styles.legendText}>Locked</Text>
          </View>
        </View>
        <View style={styles.legendDivider} />
        <View style={styles.legendRow}>
          <View style={styles.legendLineItem}>
            <View style={[styles.legendLine, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.legendTextSmall}>Progression</Text>
          </View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendLineItem}>
            <View style={[styles.legendLineDashed, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendTextSmall}>Reinforcement</Text>
          </View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendLineItem}>
            <View style={[styles.legendLine, { backgroundColor: '#9C27B0' }]} />
            <Text style={styles.legendTextSmall}>Skill Chain</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  svg: {
    backgroundColor: '#FAFAFA',
  },
  legend: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 140,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  legendCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },
  legendTextSmall: {
    fontSize: 10,
    color: '#333',
    fontWeight: '500',
  },
  legendDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 6,
  },
  legendLineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  legendLineDashed: {
    width: 20,
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
});
