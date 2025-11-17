// app/tabs/rec-system/index.tsx
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

import { RecommendationPanel } from './components/RecommendationPanel';
import { DebugPanel } from './components/DebugPanel';

// 和 Select a Student 使用的 key 保持一致
const STORAGE_KEY = 'selected_student';

// 本文件内部用的加载函数
async function loadSelectedStudent(): Promise<any | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error loading student:', error);
    return null;
  }
}

// ⭐ 推荐系统页面
export default function RecSystemPage() {
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const isFocused = useIsFocused();

  // 如果有选中的学生，就用它的 user_id / id；否则用默认 Y3_U1
  const userId = selectedStudent?.user_id ?? selectedStudent?.id ?? 'Y3_U1';
  const completedNodeId = 'EARTH.Y3.AC9S3U02';

  // 每次页面获得焦点时，重新从 storage 读取当前学生
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
      {/* 顶部：标题 + 学生信息 + 右上角 Debug 开关 */}
      <View style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          {/* 左侧：标题 + 当前学生 */}
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

          {/* 右上角 Debug Mode 开关 */}
          <DebugPanel
            userId={userId}
            completedNodeId={completedNodeId}
          />
        </View>
      </View>

      {/* 推荐结果列表 */}
      <RecommendationPanel
        userId={userId}
        completedNodeId={completedNodeId}
        onSelect={(item) =>
          Alert.alert('Go Next', `${item.kind}: ${item.title}`)
        }
      />
    </SafeAreaView>
  );
}




