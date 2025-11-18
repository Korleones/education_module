import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { RecommendationItem } from '../types/models';

interface Props {
  item: RecommendationItem;
  onPress?: (item: RecommendationItem) => void; // Allow external transmission via onPress (optional)
}

// Based on numerical values, map to high / medium / low.
const getConfidenceLabel = (c?: number) => {
  if (c == null) return '—';
  if (c >= 0.85) return 'high';
  if (c >= 0.7) return 'medium';
  return 'low';
};

export const RecommendationCard: React.FC<Props> = ({ item, onPress }) => {
  const [showReason, setShowReason] = React.useState(false);

  return (
    // The entire card is clickable (if onPress is passed from the upper layer).
    <Pressable onPress={() => onPress?.(item)} style={styles.card}>
      {/* Title + Why This Button */}
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

      {showReason && <Text style={styles.reason}>{item.reason}</Text>}

      <Text style={styles.confidence}>
        Confidence: {getConfidenceLabel(item.confidence)}
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

