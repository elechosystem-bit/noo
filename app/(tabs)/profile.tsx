import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../src/config/firebase";

export default function Profile() {
  const router = useRouter();
  const user = auth.currentUser;

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user?.displayName?.[0]?.toUpperCase() || "?"}</Text>
      </View>
      <Text style={styles.name}>{user?.displayName || "Utilisateur"}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>👨‍👩‍👧‍👦  Ma famille</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>🔗  Code d'invitation</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>⚙️  Paramètres</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", padding: 30, backgroundColor: "#F8F9FA" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  avatarText: { color: "#fff", fontSize: 40, fontWeight: "bold" },
  name: { fontSize: 24, fontWeight: "bold", color: "#333", marginTop: 15 },
  email: { fontSize: 14, color: "#999", marginTop: 5 },
  section: { width: "100%", marginTop: 40 },
  menuItem: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 10,
  },
  menuText: { fontSize: 16, color: "#333" },
  logoutButton: {
    marginTop: 30,
    padding: 15,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#FF4757",
    width: "100%",
    alignItems: "center",
  },
  logoutText: { color: "#FF4757", fontSize: 16, fontWeight: "600" },
});
