import { Stack } from "expo-router";

export default function NavigationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, 
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="skill-tree/index" />
      <Stack.Screen name="rec-system/index" />
      <Stack.Screen name="constellation-chart/index" />
      <Stack.Screen name="scrollable-steps/index" />
    </Stack>
  );
}
