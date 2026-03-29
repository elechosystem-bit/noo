import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../../src/config/firebase";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");
    if (!name || !email || !password) { setError("Veuillez remplir tous les champs"); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      router.replace("/(auth)/onboarding");
    } catch (err: any) { setError(err.message || "Erreur"); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>🏡</Text>
        <Text style={styles.title}>Creer votre espace</Text>
        <Text style={styles.subtitle}>Un endroit rien que pour votre famille</Text>

        {error ? <View style={styles.errBox}><Text style={styles.errText}>{error}</Text></View> : null}

        <Text style={styles.label}>PRENOM</Text>
        <TextInput style={styles.input} placeholder="Votre prenom" placeholderTextColor="#B0978A" value={name} onChangeText={setName} />

        <Text style={styles.label}>EMAIL</Text>
        <TextInput style={styles.input} placeholder="votre@email.com" placeholderTextColor="#B0978A" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>MOT DE PASSE</Text>
        <TextInput style={styles.input} placeholder="Minimum 6 caracteres" placeholderTextColor="#B0978A" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.5 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.btnText}>{loading ? "Creation..." : "Commencer"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/login")} style={styles.linkRow}>
          <Text style={styles.link}>Deja un compte ? </Text>
          <Text style={styles.linkBold}>Se connecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F2" },
  inner: { flexGrow: 1, justifyContent: "center", padding: 24 },
  emoji: { fontSize: 48, textAlign: "center", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#2C1F14", textAlign: "center", fontStyle: "italic" },
  subtitle: { fontSize: 14, color: "#B0978A", textAlign: "center", marginBottom: 28 },
  errBox: { backgroundColor: "#FFF5F0", borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "#F5DDD0" },
  errText: { color: "#C4503A", fontSize: 13, textAlign: "center" },
  label: { fontSize: 11, fontWeight: "800", color: "#B0978A", letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: "#F5EFE6", padding: 16, borderRadius: 16, fontSize: 16, borderWidth: 2, borderColor: "transparent", color: "#2C1F14" },
  btn: { backgroundColor: "#2A7C6F", padding: 18, borderRadius: 18, alignItems: "center", marginTop: 24, shadowColor: "rgba(42,124,111,0.35)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 20, elevation: 6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  link: { color: "#B0978A", fontSize: 14 },
  linkBold: { color: "#2A7C6F", fontSize: 14, fontWeight: "800" },
});
