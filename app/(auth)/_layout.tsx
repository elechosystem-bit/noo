import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FBF7F2" },
        headerTintColor: "#2A7C6F",
        headerTitleStyle: { fontWeight: "700", color: "#2C1F14" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="login" options={{ title: "", headerBackTitle: "Retour" }} />
      <Stack.Screen name="register" options={{ title: "", headerBackTitle: "Retour" }} />
      <Stack.Screen name="onboarding" options={{ title: "", headerShown: false }} />
    </Stack>
  );
}
