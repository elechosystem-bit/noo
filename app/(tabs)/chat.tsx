import { useState, useEffect, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../src/config/firebase";

interface Message {
  id: string;
  senderName: string;
  senderId: string;
  content: string;
  createdAt: any;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(data);
    });
    return unsubscribe;
  }, []);

  const sendMessage = async () => {
    if (!text.trim()) return;
    await addDoc(collection(db, "messages"), {
      senderId: auth.currentUser?.uid,
      senderName: auth.currentUser?.displayName || "Anonyme",
      content: text,
      createdAt: serverTimestamp(),
    });
    setText("");
  };

  const isMe = (senderId: string) => senderId === auth.currentUser?.uid;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={[styles.bubble, isMe(item.senderId) ? styles.myBubble : styles.otherBubble]}>
            {!isMe(item.senderId) && <Text style={styles.senderName}>{item.senderName}</Text>}
            <Text style={[styles.messageText, isMe(item.senderId) && styles.myText]}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 50 }}>💬</Text>
            <Text style={styles.emptyText}>Démarrez la conversation familiale !</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  bubble: { maxWidth: "80%", padding: 12, borderRadius: 16, marginVertical: 4, marginHorizontal: 10 },
  myBubble: { alignSelf: "flex-end", backgroundColor: "#6C63FF" },
  otherBubble: { alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee" },
  senderName: { fontSize: 12, color: "#6C63FF", fontWeight: "600", marginBottom: 3 },
  messageText: { fontSize: 15, color: "#333" },
  myText: { color: "#fff" },
  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#999", marginTop: 10, fontSize: 16 },
  inputBar: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
  },
  input: { flex: 1, backgroundColor: "#F0F0F0", padding: 12, borderRadius: 25, fontSize: 16 },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#6C63FF",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendText: { color: "#fff", fontSize: 20 },
});
