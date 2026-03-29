import { useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { askClaude } from "../../src/services/ai";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AI() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Bonjour ! Je suis Noo, votre assistant familial. 😊\n\nJe peux vous aider avec des idées d'activités, des recettes, de l'aide aux devoirs, ou simplement discuter. Que puis-je faire pour vous ?",
    },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setText("");
    setLoading(true);

    try {
      const response = await askClaude(text, "Famille utilisant l'app Noo");
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Désolé, je rencontre un problème. Réessayez dans un moment.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={{backgroundColor:"#2A7C6F",paddingTop:Platform.OS==="ios"?14:10,paddingBottom:18,paddingHorizontal:22,position:"relative",overflow:"hidden"}}>
        <View style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:60,backgroundColor:"rgba(255,255,255,0.06)"}}/>
        <TouchableOpacity onPress={() => router.push("/(tabs)/feed")} style={{marginBottom:8}}><Text style={{fontSize:14,color:"rgba(255,255,255,0.7)",fontWeight:"700"}}>← Accueil</Text></TouchableOpacity>
        <Text style={{fontSize:26,fontWeight:"800",color:"#fff",fontStyle:"italic",marginBottom:4}}>Noo IA</Text>
        <Text style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}>Votre assistant familial</Text>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
            {item.role === "assistant" && <Text style={styles.aiLabel}>🤖 Noo</Text>}
            <Text style={[styles.text, item.role === "user" && styles.userText]}>{item.content}</Text>
          </View>
        )}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#2A7C6F" />
          <Text style={styles.loadingText}>Noo réfléchit...</Text>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Demandez à Noo..."
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={loading}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F2" },
  bubble: { maxWidth: "85%", padding: 14, borderRadius: 16, marginVertical: 4, marginHorizontal: 10 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#2A7C6F" },
  aiBubble: { alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(42,124,111,0.15)" },
  aiLabel: { fontSize: 12, color: "#2A7C6F", fontWeight: "700", marginBottom: 4 },
  text: { fontSize: 15, color: "#333", lineHeight: 22 },
  userText: { color: "#fff" },
  loadingContainer: { flexDirection: "row", alignItems: "center", padding: 10, justifyContent: "center" },
  loadingText: { color: "#2A7C6F", marginLeft: 8, fontSize: 14 },
  inputBar: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "rgba(107,78,61,0.08)",
    alignItems: "center",
  },
  input: { flex: 1, backgroundColor: "#D0EDE9", padding: 12, borderRadius: 25, fontSize: 16 },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#2A7C6F",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendText: { color: "#fff", fontSize: 20 },
});
