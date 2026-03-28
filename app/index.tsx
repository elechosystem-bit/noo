import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🏠</Text>
      <Text style={styles.title}>Noo</Text>
      <Text style={styles.subtitle}>Le réseau social de votre famille</Text>
      <Text style={styles.description}>
        Partagez vos moments, discutez ensemble et profitez d'un assistant IA
        familial bienveillant.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/(auth)/login")}
      >
        <Text style={styles.buttonText}>Se connecter</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonOutline}
        onPress={() => router.push("/(auth)/register")}
      >
        <Text style={styles.buttonOutlineText}>Créer un compte</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#F8F9FA",
  },
  logo: { fontSize: 80, marginBottom: 10 },
  title: { fontSize: 42, fontWeight: "bold", color: "#6C63FF" },
  subtitle: { fontSize: 18, color: "#666", marginBottom: 20, textAlign: "center" },
  description: { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 40, lineHeight: 22 },
  button: {
    backgroundColor: "#6C63FF",
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
    marginBottom: 15,
    width: "100%",
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  buttonOutline: {
    borderWidth: 2,
    borderColor: "#6C63FF",
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
    width: "100%",
    alignItems: "center",
  },
  buttonOutlineText: { color: "#6C63FF", fontSize: 18, fontWeight: "600" },
});
