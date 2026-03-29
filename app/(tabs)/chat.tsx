import { useState, useEffect, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../src/config/firebase";
import { useFamily } from "../../src/hooks/useFamily";

interface Message {
  id: string;
  senderName: string;
  senderId: string;
  content: string;
  createdAt: any;
}

export default function Chat() {
  const { familyId, familyName, aiName } = useFamily();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!familyId) return;
    const messagesRef = collection(db, "families", familyId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Message[];
      setMessages(data);
    });
    return unsubscribe;
  }, [familyId]);

  const sendMessage = async () => {
    if (!text.trim() || !familyId) return;
    await addDoc(collection(db, "families", familyId, "messages"), {
      senderId: auth.currentUser?.uid,
      senderName: auth.currentUser?.displayName || "Anonyme",
      content: text,
      createdAt: serverTimestamp(),
    });
    setText("");
  };

  const isMe = (senderId: string) => senderId === auth.currentUser?.uid;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.familyCard}>
          <Text style={{ fontSize: 20 }}>👨‍👩‍👧‍👦</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.familyName}>{familyName || "Ma famille"}</Text>
            <Text style={styles.familySub}>{aiName || "Noo"} actif</Text>
          </View>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>🤖 {aiName || "Noo"}</Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={{ padding: 18, paddingBottom: 8 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", justifyContent: isMe(item.senderId) ? "flex-end" : "flex-start", marginBottom: 12, alignItems: "flex-end", gap: 8 }}>
            {!isMe(item.senderId) && (
              <View style={styles.avatar}>
                <Text style={{ fontSize: 14 }}>{item.senderName?.[0]?.toUpperCase() || "?"}</Text>
              </View>
            )}
            <View style={{ maxWidth: "78%" }}>
              {!isMe(item.senderId) && <Text style={styles.senderName}>{item.senderName}</Text>}
              <View style={isMe(item.senderId) ? styles.bubbleMe : styles.bubbleOther}>
                <Text style={isMe(item.senderId) ? styles.textMe : styles.textOther}>{item.content}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>💬</Text>
            <Text style={styles.emptyText}>Commencez la conversation !</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <View style={[styles.inputWrap, text.length > 0 && styles.inputWrapFocused]}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor="#B0978A"
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, text.trim() ? styles.sendBtnActive : null]}
            onPress={sendMessage}
            activeOpacity={0.8}
          >
            <Text style={[styles.sendIcon, text.trim() ? styles.sendIconActive : null]}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F2" },

  header: { backgroundColor: "#fff", paddingTop: Platform.OS === "ios" ? 56 : 36, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "rgba(107,78,61,0.06)" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#2C1F14", fontStyle: "italic", marginBottom: 12 },
  familyCard: { backgroundColor: "#2A7C6F", borderRadius: 18, padding: 12, flexDirection: "row", gap: 10, alignItems: "center" },
  familyName: { fontSize: 14, fontWeight: "800", color: "#fff" },
  familySub: { fontSize: 11, color: "rgba(255,255,255,0.6)" },
  aiBadge: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  aiBadgeText: { fontSize: 11, color: "#fff", fontWeight: "800" },

  list: { flex: 1 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F5EFE6", alignItems: "center", justifyContent: "center" },
  senderName: { fontSize: 10, fontWeight: "800", color: "#B0978A", marginBottom: 3, letterSpacing: 0.3 },

  bubbleMe: { backgroundColor: "#2A7C6F", borderRadius: 20, borderBottomRightRadius: 4, padding: 12, paddingHorizontal: 16 },
  bubbleOther: { backgroundColor: "#fff", borderRadius: 20, borderBottomLeftRadius: 4, padding: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: "rgba(107,78,61,0.08)", shadowColor: "rgba(44,31,20,0.06)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  textMe: { fontSize: 15, color: "#fff", lineHeight: 22 },
  textOther: { fontSize: 15, color: "#2C1F14", lineHeight: 22 },

  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#B0978A", fontSize: 15, lineHeight: 24, textAlign: "center" },

  inputBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "rgba(107,78,61,0.06)" },
  inputWrap: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#F5EFE6", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderWidth: 1.5, borderColor: "transparent" },
  inputWrapFocused: { borderColor: "#2A7C6F" },
  input: { flex: 1, fontSize: 15, color: "#2C1F14", maxHeight: 80, lineHeight: 20 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EDE3D5", alignItems: "center", justifyContent: "center" },
  sendBtnActive: { backgroundColor: "#2A7C6F" },
  sendIcon: { fontSize: 16, color: "#B0978A" },
  sendIconActive: { color: "#fff" },
});
