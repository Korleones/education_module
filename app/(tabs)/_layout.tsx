/**
 * Layout component that defines the bottom tab navigation for the app.
 *
 * This component uses Expo Router's <Tabs> to create a tab-based navigation layout.
 * Each <Tabs.Screen> represents a different page within the tab bar (Home, Search, Me, Recommendation).
 *
 * The Ionicons library provides the tab icons.
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Layout() {
  return (
    // Define the bottom tab navigation layout
    <Tabs
      screenOptions={{
        headerShown: false,           // Hide the top navigation header
        tabBarActiveTintColor: '#007AFF',  // Color of the icon/text when selected
        tabBarInactiveTintColor: '#8e8e93', // Color when not selected
        tabBarStyle: {                // Styling for the entire tab bar
          backgroundColor: '#fff',
          borderTopWidth: 0.3,
          borderTopColor: '#ccc',
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,              // Label text size under icons
        },
      }}
    >
      {/* Home tab */}
      <Tabs.Screen
        name="home" // Corresponds to app/(tabs)/home.tsx
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Search tab */}
      <Tabs.Screen
        name="search" // Corresponds to app/(tabs)/search.tsx
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Profile (Me) tab */}
      <Tabs.Screen
        name="profile" // Corresponds to app/(tabs)/profile.tsx
        options={{
          title: 'Me',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Recommendation tab */}
      <Tabs.Screen
        name="navigation" // Corresponds to app/(tabs)/navigation.tsx
        options={{
          title: 'Rec',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
