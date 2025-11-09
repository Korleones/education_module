<<<<<<< HEAD
/**
 * Layout component that defines the bottom tab navigation for the app.
 *
 * This component uses Expo Router's <Tabs> to create a tab-based navigation layout.
 * Each <Tabs.Screen> represents a different page within the tab bar (Home, Search, Me, Recommendation).
 *
 * The Ionicons library provides the tab icons.
 */

=======
>>>>>>> a24ea20 (feat(navigation bar): add the navigation bar and 4 simulating pages)
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Layout() {
<<<<<<< HEAD
  return (
    // Define the bottom tab navigation layout
    <Tabs
      screenOptions={{
        headerShown: false,           // Hide the top navigation header
        tabBarActiveTintColor: '#007AFF',  // Color of the icon/text when selected
        tabBarInactiveTintColor: '#8e8e93', // Color when not selected
        tabBarStyle: {                // Styling for the entire tab bar
=======

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
>>>>>>> a24ea20 (feat(navigation bar): add the navigation bar and 4 simulating pages)
          backgroundColor: '#fff',
          borderTopWidth: 0.3,
          borderTopColor: '#ccc',
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
<<<<<<< HEAD
          fontSize: 12,              // Label text size under icons
        },
      }}
    >
      {/* Home tab */}
      <Tabs.Screen
        name="home" // Corresponds to app/(tabs)/home.tsx
        options={{
          title: 'Home',
=======
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '首页',
>>>>>>> a24ea20 (feat(navigation bar): add the navigation bar and 4 simulating pages)
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
<<<<<<< HEAD

      {/* Search tab */}
      <Tabs.Screen
        name="search" // Corresponds to app/(tabs)/search.tsx
        options={{
          title: 'Search',
=======
      <Tabs.Screen
        name="search"
        options={{
          title: '搜索',
>>>>>>> a24ea20 (feat(navigation bar): add the navigation bar and 4 simulating pages)
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
<<<<<<< HEAD

      {/* Profile (Me) tab */}
      <Tabs.Screen
        name="profile" // Corresponds to app/(tabs)/profile.tsx
        options={{
          title: 'Me',
=======
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
>>>>>>> a24ea20 (feat(navigation bar): add the navigation bar and 4 simulating pages)
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
<<<<<<< HEAD

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
       <Tabs.Screen
        name="rec-system/index"
        options={{
          href: null, 
        }}
      />

       <Tabs.Screen
        name="skill-tree/index"
        options={{
          href: null,
        }}
      />
       <Tabs.Screen
        name="constellation-chart/index"
        options={{
          href: null, 
        }}
      />
    </Tabs>


=======
        <Tabs.Screen
        name="navigation"
        options={{
          title: 'nide',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
>>>>>>> a24ea20 (feat(navigation bar): add the navigation bar and 4 simulating pages)
  );
}
