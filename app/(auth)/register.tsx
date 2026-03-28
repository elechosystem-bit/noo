import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../src/config/firebase";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !familyName) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      const familyId = `family_${Date.now()}`;
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      await setDoc(doc(db, "families", familyId), {
        name: familyName,
        createdBy: user.uid,
        inviteCode,
        members: [user.uid],
        createdAt: new Date(),
      });

      await setDoc(doc(db, "users", user.uid), {
        displayName: name,
        email,
        familyId,
        role: "admin",
        createdAt: new Date(),
      });

      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rejoindre Noo 🎉</Text>

      <TextInput style={styles.input} placeholder="Votre prénom" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Nom de famille (groupe)" value={familyName} onChangeText={setFamilyName} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Création..." : "Créer ma famille"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
        <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 30, backgroundColor: "#F8F9FA" },
  title: { fontSize: 28, fontWeight: "bold", color: "#333", marginBottom: 30, textAlign: "center" },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  button: {
    backgroundColor: "#6C63FF",
    padding: 15,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  link: { color: "#6C63FF", textAlign: "center", marginTop: 20, fontSize: 14 },
});
