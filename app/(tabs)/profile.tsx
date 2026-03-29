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
      <View style={{backgroundColor:"#2A7C6F",paddingTop:14,paddingBottom:28,paddingHorizontal:22,alignItems:"center",position:"relative",overflow:"hidden"}}>
        <View style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:60,backgroundColor:"rgba(255,255,255,0.06)"}}/>
        <TouchableOpacity onPress={() => router.push("/(tabs)/feed")} style={{alignSelf:"flex-start",marginBottom:8}}><Text style={{fontSize:14,color:"rgba(255,255,255,0.7)",fontWeight:"700"}}>← Accueil</Text></TouchableOpacity>
        <View style={[styles.avatar,{marginTop:0}]}>
          <Text style={styles.avatarText}>{user?.displayName?.[0]?.toUpperCase() || "?"}</Text>
        </View>
        <Text style={[styles.name,{color:"#fff"}]}>{user?.displayName || "Utilisateur"}</Text>
        <Text style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}>{user?.email}</Text>
      </View>

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
  container: { flex: 1, alignItems: "center", padding: 30, backgroundColor: "#FBF7F2" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2A7C6F",
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
