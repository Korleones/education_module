import { View, Text, StyleSheet } from 'react-native';

export default function Navigation() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>👤 导航页</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
  },
});
