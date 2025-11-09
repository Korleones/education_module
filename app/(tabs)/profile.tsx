/**
* Just for display
 */

import { View, Text, StyleSheet } from 'react-native';

export default function Profile() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>👤 Me</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
<<<<<<< HEAD
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
=======
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
>>>>>>> a24ea20 (feat(navigation bar): add the navigation bar and 4 simulating pages)
  },
});
