import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";


/** 
* A navigation page to navigate user to skill tree, recommender sysyetm or constellation chart.
*/
export default function Navigation() {
  const handlePress = (label: string) => {
    Alert.alert(`Clicked: ${label}`);
  };

  return (
    <View style={styles.container}>
      {/* Skill Tree */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => handlePress("Skill Tree")}
      >
        <Text style={styles.buttonText}>🌿 Skill Tree</Text>
      </TouchableOpacity>

      {/* Recommender System */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => handlePress("Recommender System")}
      >
        <Text style={styles.buttonText}>🎯 Recommender System</Text>
      </TouchableOpacity>

      {/* Constellation Chart */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => handlePress("Constellation Chart")}
      >
        <Text style={styles.buttonText}>🌌 Constellation Chart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
});
