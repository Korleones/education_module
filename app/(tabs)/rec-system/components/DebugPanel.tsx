// app/tabs/rec-system/components/DebugPanel.tsx
import React from 'react';
import { View, Text, Switch, FlatList } from 'react-native';

import { getNextStepsForDebug } from '../services/recommendationService';
import { isDebugMode, setDebugMode } from '../state/debugMode';

type Metrics = {
  precision: number;
  recall: number;
  missing: { id: string; kind: string }[];
  unexpected: { id: string; kind: string }[];
} | null;

export const DebugPanel: React.FC<{
  userId?: string;
  completedNodeId?: string;
}> = ({ userId, completedNodeId }) => {
  const [debug, setDebug] = React.useState(isDebugMode());
  const [metrics, setMetrics] = React.useState<Metrics>(null);

  async function updateMetrics(debugOn: boolean) {
    if (!debugOn || !userId || !completedNodeId) {
      setMetrics(null);
      return;
    }

    const res = await getNextStepsForDebug(userId, completedNodeId);
    setMetrics(res.compare ?? null);
  }

  const toggleDebug = async (val: boolean) => {
    setDebugMode(val);
    setDebug(val);
    await updateMetrics(val);
  };

  return (
    <View style={{ paddingLeft: 16, paddingRight: 16, paddingVertical: 8 }}>
      {/* 顶部只保留 Debug Mode + 开关 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <Text style={{ marginRight: 8 }}>Debug Mode</Text>
        <Switch value={debug} onValueChange={toggleDebug} />
      </View>

      {/* 打开 Debug 模式后，下面照常显示调试信息 */}
      {debug && metrics && (
        <View style={{ marginTop: 6 }}>
          <Text style={{ fontWeight: '600' }}>
            Precision: {(metrics.precision * 100).toFixed(0)}%
            {'   '}
            Recall: {(metrics.recall * 100).toFixed(0)}%
          </Text>

          <Text style={{ marginTop: 6, fontWeight: '600' }}>Missing (FN):</Text>
          <FlatList
            data={metrics.missing}
            keyExtractor={(x, i) => `m-${i}`}
            renderItem={({ item }) => <Text>- {item.kind}: {item.id}</Text>}
            ListEmptyComponent={<Text>None</Text>}
          />

          <Text style={{ marginTop: 6, fontWeight: '600' }}>Unexpected (FP):</Text>
          <FlatList
            data={metrics.unexpected}
            keyExtractor={(x, i) => `u-${i}`}
            renderItem={({ item }) => <Text>- {item.kind}: {item.id}</Text>}
            ListEmptyComponent={<Text>None</Text>}
          />
        </View>
      )}
    </View>
  );
};





