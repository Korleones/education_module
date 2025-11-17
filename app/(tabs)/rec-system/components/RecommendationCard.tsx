import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { RecommendationItem } from '../types/models';

interface Props {
  item: RecommendationItem;
  onPress?: (item: RecommendationItem) => void; // 允许外面传 onPress（可选）
}

export const RecommendationCard: React.FC<Props> = ({ item, onPress }) => {
  const [showReason, setShowReason] = React.useState(false);

  return (
    // 整个卡片可点击（如果上层传了 onPress）
    <Pressable
      onPress={() => onPress?.(item)}
      style={styles.card}
    >
      {/* 标题 + Why This 按钮 */}
      <View style={styles.topRow}>
        <Text style={styles.title}>{item.title}</Text>

        <Pressable
          onPress={() => setShowReason((v) => !v)}
          style={styles.whyBtn}
        >
          <Text style={styles.whyText}>
            {showReason ? 'Hide reason' : 'Why This?'}
          </Text>
        </Pressable>
      </View>

      {showReason && (
        <Text style={styles.reason}>{item.reason}</Text>
      )}

      <Text style={styles.confidence}>
        Confidence: {(item.confidence * 100).toFixed(0)}%
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    backgroundColor: '#f9fafb',
    marginBottom: 10,
    borderRadius: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
    fontSize: 16,
    flexShrink: 1,
    paddingRight: 10,
  },
  whyBtn: {
    borderWidth: 1,
    borderColor: '#111',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  whyText: {
    fontSize: 12,
    color: '#111',
  },
  reason: {
    marginTop: 8,
    color: '#374151',
  },
  confidence: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7280',
  },
});
