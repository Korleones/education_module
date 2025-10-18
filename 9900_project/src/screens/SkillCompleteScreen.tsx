import React from 'react';
import { View, Text, SafeAreaView, Alert } from 'react-native';
import { RecommendationPanel } from '../components/RecommendationPanel';
import { DebugPanel } from '../components/DebugPanel';

export const SkillCompleteScreen: React.FC = () => {
  // 你可以换成 users_progress.json 里真实存在的用户/节点
  const userId = 'Y3_U1';
  const completedNodeId = 'EARTH.Y3.AC9S3U02';

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Skill Completed ✅</Text>
        <Text style={{ marginTop: 6, color: '#374151' }}>User: {userId}  Completed: {completedNodeId}</Text>
      </View>

      <RecommendationPanel
        userId={userId}
        completedNodeId={completedNodeId}
        onSelect={(it) => Alert.alert('Go Next', `${it.kind}: ${it.title}`)}
      />
      <DebugPanel />
    </SafeAreaView>
  );
};
