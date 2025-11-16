/**
 * You can choose the mock student in "Me" page
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Pressable,
} from 'react-native';
import { saveSelectedStudent, loadSelectedStudent } from '../../../utils/storage';
import studentsData from '../../../assets/data/mock_users_progress.json';

// Android need to enable LayoutAnimation support
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Profile() {
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [expanded, setExpanded] = useState(false); // control expand state

  // Load last saved student info
  useEffect(() => {
    const fetchSavedStudent = async () => {
      const saved = await loadSelectedStudent();
      if (saved) {
        setCurrentStudent(saved);
      }
    };
    fetchSavedStudent();
  }, []);


  // When a student is chosen, save it but don't collapse
  const handleSelectStudent = async (student: any) => {
    setCurrentStudent(student);
    await saveSelectedStudent(student); 
  };


  // switch expand state
  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>👩‍🎓 Select a Student</Text>

      <FlatList
        data={studentsData.users}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.item,
              currentStudent?.user_id === item.user_id && styles.selectedItem,
            ]}
            onPress={() => handleSelectStudent(item)}
           
          >
            <Text
              style={[
                styles.itemText,
                currentStudent?.user_id === item.user_id && styles.selectedText,
              ]}
            >
              {item.user_id}
            </Text>
            <Text
              style={[
                styles.itemSub,
                currentStudent?.user_id === item.user_id && styles.selectedText,
              ]}
            >
              Year: {item.year}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* show selected students */}
      {currentStudent && (
        <View style={styles.infoBox}>
          {/* Header：title + arrow */}
          <Pressable style={styles.infoHeader} onPress={toggleExpand}>
            <Text style={styles.infoTitle}>📘 Current Student</Text>
            {/* Reverse arrow logic ：unexpaned ▲，expaned ▼ */}
            <Text style={styles.expandText}>{expanded ? '▼' : '▲'}</Text>
          </Pressable>

          {/* expand area */}
          {expanded && (
            <View style={styles.details}>
              {/* Basic Info */}
              <Text style={styles.infoText}>🆔 ID: {currentStudent.user_id}</Text>
              <Text style={styles.infoText}>🎓 Year: {currentStudent.year}</Text>

              {/* Skill Levels */}
              <Text style={styles.infoSubtitle}>💪 Skill Levels:</Text>
              {Object.entries(
                currentStudent.skills_levels as Record<string, number>
              ).map(([key, value]) => (
                <Text key={key} style={styles.infoSubText}>
                  • {key}: {value}
                </Text>
              ))}

              {/* Knowledge Progress */}
              <Text style={styles.infoSubtitle}>📖 Knowledge Progress:</Text>
              {currentStudent.knowledge_progress.map((k: any, index: number) => (
                <Text key={k.node} style={styles.infoSubText}>
                  • {k.node} — Level {k.level}
                </Text>
              ))}

              {/* Career Interests */}
              <Text style={styles.infoSubtitle}>💼 Career Interests:</Text>
              <Text style={styles.infoSubText}>
                {currentStudent.career_interests.join(', ')}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  item: {
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#f3f3f3',
  },
  selectedItem: {
    backgroundColor: '#007AFF',
  },
  itemText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  itemSub: {
    fontSize: 14,
    color: '#777',
  },
  selectedText: {
    color: '#fff',
  },

  // Info Box
  infoBox: {
    marginTop: 20,
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandText: {
    fontSize: 20,
    color: '#555',
  },
  details: {
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 6,
  },
  infoSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    color: '#333',
  },
  infoSubText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 10,
  },
});
