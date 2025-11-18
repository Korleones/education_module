// app/tabs/rec-system/index.tsx
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

import { RecommendationPanel } from './components/RecommendationPanel';
import { DebugPanel } from './components/DebugPanel';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Use the same key as “Select a Student”
const STORAGE_KEY = 'selected_student';

// Local loading function used inside this file
async function loadSelectedStudent(): Promise<any | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error loading student:', error);
    return null;
  }
}

// ⭐ Recommendation System Page
export default function RecSystemPage() {
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const isFocused = useIsFocused();

  // If a student is selected, use its user_id / id; otherwise default to Y3_U1
  const userId = selectedStudent?.user_id ?? selectedStudent?.id ?? 'Y3_U1';
  const completedNodeId = 'EARTH.Y3.AC9S3U02';

  // Reload current selected student from storage whenever page gains focus
  useEffect(() => {
    if (!isFocused) return;

    let cancelled = false;

    (async () => {
      const saved = await loadSelectedStudent();
      if (!cancelled && saved) {
        setSelectedStudent(saved);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isFocused]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Floating Back button at the top */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push('/navigation')}
      >
        <Ionicons name="chevron-back" size={22} color="#333" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Move the whole layer downward to avoid overlapping with Back button */}
      <View style={{ flex: 1, paddingTop: 80 }}>
        {/* Top section: title + student info + top-right Debug toggle */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            {/* Left: title + current student */}
            <View style={{ flexShrink: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 22, fontWeight: '800' }}>
                Skill Completed ✅
              </Text>

              <Text style={{ marginTop: 6, color: '#374151' }}>
                User: {userId}
                {selectedStudent?.year ? `   Year: ${selectedStudent.year}` : ''}
              </Text>

              {!selectedStudent && (
                <Text style={{ marginTop: 4, color: '#9ca3af', fontSize: 12 }}>
                  Tip: select a student first on the "Select a Student" screen.
                </Text>
              )}
            </View>

            {/* Top-right Debug Mode switch */}
            <DebugPanel userId={userId} completedNodeId={completedNodeId} />
          </View>
        </View>

        {/* Recommendation result list */}
        <RecommendationPanel
          userId={userId}
          completedNodeId={completedNodeId}
          onSelect={(item) =>
            Alert.alert('Go Next', `${item.kind}: ${item.title}`)
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
