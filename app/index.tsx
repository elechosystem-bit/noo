import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";

export default function Welcome() {
  const router = useRouter();

  const features = [
    { e: "📚", t: "Livres recommandes par une IA qui vous connait" },
    { e: "💬", t: "Messagerie privee rien qu'entre vous" },
    { e: "🏆", t: "Defis pour se retrouver dans la vraie vie" },
    { e: "🧭", t: "Accompagnement de l'enfance a l'orientation" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.float}>🏡</Text>
        <Text style={styles.title}>
          Bienvenue{"\n"}dans <Text style={styles.titleAccent}>NOO</Text>
        </Text>
        <Text style={styles.subtitle}>
          L'espace prive de votre famille.{"\n"}
          <Text style={styles.italic}>Le lien qui tient.</Text>
        </Text>
      </View>

      <View style={styles.features}>
        {features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Text style={styles.featureEmoji}>{f.e}</Text>
            <Text style={styles.featureText}>{f.t}</Text>
          </View>
        ))}
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.push("/(auth)/register")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Creer notre espace</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnOutlineText}>J'ai deja un compte</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1F5C52",
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },
  top: {
    alignItems: "center",
    marginBottom: 28,
  },
  float: { fontSize: 68, marginBottom: 18 },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: 48,
    marginBottom: 12,
    fontStyle: "italic",
  },
  titleAccent: { color: "#A8DDD7", fontStyle: "italic" },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 24,
  },
  italic: { fontStyle: "italic" },

  features: { flex: 1, justifyContent: "center", gap: 10 },
  featureRow: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  featureEmoji: { fontSize: 24 },
  featureText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)", flex: 1 },

  bottom: { gap: 10, marginTop: 20 },
  btn: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  btnText: { color: "#2A7C6F", fontSize: 16, fontWeight: "800" },
  btnOutline: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  btnOutlineText: { color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: "600" },
});
