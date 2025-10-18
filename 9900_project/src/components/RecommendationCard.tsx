import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { RecommendationItem } from '../types/models';

export const RecommendationCard: React.FC<{ item: RecommendationItem; onPress?: (i: RecommendationItem) => void; }> = ({ item, onPress }) => (
  <Pressable
    onPress={() => onPress?.(item)}
    style={({ pressed }) => ({
      backgroundColor: '#fff',
      padding: 12,
      borderRadius: 12,
      marginVertical: 6,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      opacity: pressed ? 0.9 : 1
    })}
  >
    <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.title}</Text>
    <Text style={{ marginTop: 4, color: '#374151' }}>{item.reason}</Text>
    <Text style={{ marginTop: 6, fontSize: 12, color: '#6B7280' }}>
      Confidence: {(item.confidence * 100).toFixed(0)}%
    </Text>
  </Pressable>
);
