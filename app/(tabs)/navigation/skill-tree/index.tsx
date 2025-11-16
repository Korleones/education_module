import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Skilltree() {
  return (
    <View style={{ flex: 1 }}>

    
      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/navigation')}>
        <Ionicons name="chevron-back" size={22} color="#333" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

    
      <View style={styles.content}>
        <Text style={{ fontSize: 20 }}>Skill Tree</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 20,              // iOS 顶部安全区
    left: 20,
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
    elevation: 3,        // Android 阴影
    zIndex: 10,
  },
  backText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 2,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
