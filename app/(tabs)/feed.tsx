import { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert,
} from "react-native";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../src/config/firebase";

interface Post {
  id: string;
  authorName: string;
  content: string;
  createdAt: any;
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Post[];
      setPosts(postsData);
    });
    return unsubscribe;
  }, []);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    try {
      await addDoc(collection(db, "posts"), {
        authorId: auth.currentUser?.uid,
        authorName: auth.currentUser?.displayName || "Anonyme",
        content: newPost,
        likes: [],
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });
      setNewPost("");
      setShowInput(false);
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    }
  };

  return (
    <View style={styles.container}>
      {showInput ? (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Quoi de neuf dans la famille ?"
            value={newPost}
            onChangeText={setNewPost}
            multiline
          />
          <View style={styles.inputActions}>
            <TouchableOpacity onPress={() => setShowInput(false)}>
              <Text style={styles.cancel}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.postButton} onPress={handlePost}>
              <Text style={styles.postButtonText}>Publier</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <Text style={styles.authorName}>{item.authorName}</Text>
            <Text style={styles.postContent}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyText}>Aucune publication pour le moment</Text>
            <Text style={styles.emptySubtext}>Soyez le premier à partager !</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowInput(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  inputContainer: { padding: 15, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  input: { fontSize: 16, minHeight: 80, textAlignVertical: "top" },
  inputActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  cancel: { color: "#999", fontSize: 16, padding: 10 },
  postButton: { backgroundColor: "#6C63FF", paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20 },
  postButtonText: { color: "#fff", fontWeight: "600" },
  postCard: {
    backgroundColor: "#fff",
    margin: 10,
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  authorName: { fontWeight: "bold", fontSize: 16, color: "#333", marginBottom: 5 },
  postContent: { fontSize: 15, color: "#555", lineHeight: 22 },
  empty: { alignItems: "center", marginTop: 100 },
  emptyIcon: { fontSize: 60, marginBottom: 15 },
  emptyText: { fontSize: 18, color: "#666", fontWeight: "600" },
  emptySubtext: { fontSize: 14, color: "#999", marginTop: 5 },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#6C63FF",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#6C63FF",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  fabText: { color: "#fff", fontSize: 30, fontWeight: "300" },
});
