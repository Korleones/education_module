
import { View, Text, StyleSheet } from 'react-native';

export default function Navigation() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Our beautiful Recommendation</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
<<<<<<< HEAD
    backgroundColor: "#fff",
    justifyContent: "space-evenly",  //vertical
    alignItems: "center",  //horizontal
    paddingVertical: 40,
  },
  button: {
    width: "80%", 
    height: 100, 
    backgroundColor: "#007AFF", 
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5, // Android shadow
  },
  buttonText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
=======
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
>>>>>>> a24ea20 (feat(navigation bar): add the navigation bar and 4 simulating pages)
  },
});
