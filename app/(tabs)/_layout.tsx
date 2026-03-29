import { Tabs } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";

const TABS = [
  { name: "feed",       icon: "🏠", label: "Famille"  },
  { name: "chat",       icon: "💬", label: "Messages" },
  { name: "reading",    icon: "📚", label: "Lecture"  },
  { name: "challenges", icon: "🏆", label: "Défis"    },
  { name: "profile",    icon: "👤", label: "Profil"   },
];

function CustomTabBar({ state, navigation }: any) {
  return (
    <View style={styles.navWrap}>
      <View style={styles.nav}>
        {TABS.map((tab, index) => {
          const isFocused = state.index === index;
          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.ni, isFocused && styles.niOn]}
              onPress={() => navigation.navigate(tab.name)}
              activeOpacity={0.7}
            >
              <Text style={styles.niIcon}>{tab.icon}</Text>
              <Text style={[styles.niLabel, isFocused && styles.niLabelOn]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="reading" />
      <Tabs.Screen name="challenges" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="ai"      options={{ href: null }} />
      <Tabs.Screen name="gallery" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  navWrap: {
    backgroundColor: "#FBF7F2",
    borderTopWidth: 1,
    borderTopColor: "rgba(107,78,61,0.08)",
    paddingBottom: Platform.OS === "ios" ? 20 : 4,
    shadowColor: "#2C1F14",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  nav: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    paddingTop: 10,
    paddingHorizontal: 4,
    height: 60,
  },
  ni: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 16,
    marginHorizontal: 2,
  },
  niOn: { backgroundColor: "#D0EDE9" },
  niIcon: { fontSize: 22, lineHeight: 26 },
  niLabel: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#C4B0A8",
  },
  niLabelOn: { color: "#2A7C6F" },
});
