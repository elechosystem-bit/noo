import { Tabs } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";

function BackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push("/(tabs)/feed")} style={{ paddingLeft: 16, paddingRight: 8 }}>
      <Text style={{ fontSize: 16, color: "#2A7C6F", fontWeight: "700" }}>← Accueil</Text>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2A7C6F",
        tabBarInactiveTintColor: "#B0978A",
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 9.5,
          fontWeight: "800",
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginTop: 2,
          marginBottom: Platform.OS === "ios" ? 0 : 6,
        },
        tabBarStyle: { display: "none" },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Famille",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <View style={[styles.ni, focused && styles.niOn]}>
              <Text style={styles.niIcon}>🏠</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Messages",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.ni, focused && styles.niOn]}>
              <Text style={styles.niIcon}>💬</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reading"
        options={{
          title: "Lecture",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.ni, focused && styles.niOn]}>
              <Text style={styles.niIcon}>📚</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: "Defis",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.ni, focused && styles.niOn]}>
              <Text style={styles.niIcon}>🤝</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.ni, focused && styles.niOn]}>
              <Text style={styles.niIcon}>👤</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="ai" options={{ href: null, title: "Noo IA" }} />
      <Tabs.Screen name="gallery" options={{ href: null, title: "Souvenirs" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  ni: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  niOn: {
    backgroundColor: "#D0EDE9",
  },
  niIcon: {
    fontSize: 22,
  },
});
