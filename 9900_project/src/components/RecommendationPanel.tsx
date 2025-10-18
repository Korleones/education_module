import React from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { getNextSteps } from '../services/recommendationService';
import { RecommendationCard } from './RecommendationCard';
import type { RecommendationItem } from '../types/models';

export const RecommendationPanel: React.FC<{
  userId: string;
  completedNodeId: string;
  onSelect?: (i: RecommendationItem) => void;
}> = ({ userId, completedNodeId, onSelect }) => {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<RecommendationItem[]>([]);

  React.useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      const res = await getNextSteps(userId, completedNodeId);
      if (ok) { setItems(res); setLoading(false); }
    })();
    return () => { ok = false; };
  }, [userId, completedNodeId]);

  if (loading) return <View style={{ padding: 16 }}><ActivityIndicator /><Text> Loading recommendations…</Text></View>;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Next Steps</Text>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => <RecommendationCard item={item} onPress={onSelect} />}
        ListEmptyComponent={<Text>No recommendations.</Text>}
      />
    </View>
  );
};
