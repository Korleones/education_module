import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';

import { getNextSteps } from '../services/recommendationService';
import type { RecommendationItem } from '../types/models';
import { RecommendationCard } from './RecommendationCard';

type Props = {
  userId: string;
  completedNodeId: string;
  onSelect: (item: RecommendationItem) => void;
};

export const RecommendationPanel: React.FC<Props> = ({
  userId,
  completedNodeId,
  onSelect,
}) => {
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getNextSteps(userId, completedNodeId);
        if (!cancelled) setItems(res);
      } catch (e: any) {
        console.error('[rec-system] getNextSteps error', e);
        if (!cancelled) setError('Failed to load recommendations.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [userId, completedNodeId]);

  // Groups: units / videos / careers / others
  const units = items.filter((it) => it.kind === 'unit');
  const videos = items.filter((it) => it.kind === 'video');
  const careers = items.filter((it) => it.kind === 'career');
  const others = items.filter(
    (it) => it.kind !== 'unit' && it.kind !== 'video' && it.kind !== 'career'
  );

  const renderSection = (
    title: string,
    data: RecommendationItem[] | null | undefined
  ) => {
    if (!data || data.length === 0) return null;

    return (
      <View style={{ marginTop: 16 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            marginBottom: 6,
            paddingHorizontal: 16,
          }}
        >
          {title}
        </Text>

        {data.map((item) => (
          <RecommendationCard
            key={item.id}
            item={item}
            onPress={() => onSelect(item)}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 32,
        }}
      >
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: '#6b7280' }}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: '#6b7280' }}>No recommendations available.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Displayed in blocks according to the order of Units / Videos / Careers */}
      {renderSection('Game & Units', units)}
      {renderSection('Videos', videos)}
      {renderSection('Careers', careers)}

      {/* Other types (such as the original knowledge/career_gap) can be placed in the last block. */}
      {renderSection('Other Suggestions', others)}
    </ScrollView>
  );
};

