import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#6C63FF",
        tabBarInactiveTintColor: "#999",
        headerStyle: { backgroundColor: "#6C63FF" },
        headerTintColor: "#fff",
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Famille",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Discussion",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💬</Text>,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "Noo IA",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🤖</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
