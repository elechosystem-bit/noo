import { useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";

interface Memory {
  id: string;
  type: "challenge" | "book" | "moment";
  title: string;
  description: string;
  emoji: string;
  date: string;
  members?: string[];
}

const demoMemories: Memory[] = [
  {
    id: "mem_1",
    type: "moment",
    title: "Premier jour sur NOO",
    description: "Notre famille a rejoint NOO ! Le début d'une belle aventure ensemble.",
    emoji: "🎉",
    date: "Aujourd'hui",
  },
];

export default function Gallery() {
  const router = useRouter();
  const [memories] = useState<Memory[]>(demoMemories);

  const getTypeColor = (type: Memory["type"]) => {
    switch (type) {
      case "challenge": return "#4CAF50";
      case "book": return "#FF9800";
      case "moment": return "#2A7C6F";
    }
  };

  const getTypeLabel = (type: Memory["type"]) => {
    switch (type) {
      case "challenge": return "Défi";
      case "book": return "Lecture";
      case "moment": return "Moment";
    }
  };

  return (
    <View style={styles.container}>
      <View style={{backgroundColor:"#2A7C6F",paddingTop:14,paddingBottom:18,paddingHorizontal:22,position:"relative",overflow:"hidden"}}>
        <View style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:60,backgroundColor:"rgba(255,255,255,0.06)"}}/>
        <TouchableOpacity onPress={() => router.push("/(tabs)/feed")} style={{marginBottom:8}}><Text style={{fontSize:14,color:"rgba(255,255,255,0.7)",fontWeight:"700"}}>← Accueil</Text></TouchableOpacity>
        <Text style={{fontSize:26,fontWeight:"800",color:"#fff",fontStyle:"italic",marginBottom:4}}>Souvenirs</Text>
        <Text style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}>L'histoire de votre famille</Text>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notre timeline</Text>
          <Text style={styles.headerSubtitle}>
            Moment apres moment
          </Text>
        </View>

        {/* Timeline */}
        {memories.length > 0 ? (
          memories.map((memory) => (
            <View key={memory.id} style={styles.memoryCard}>
              <View style={styles.timeline}>
                <View style={[styles.dot, { backgroundColor: getTypeColor(memory.type) }]} />
                <View style={styles.line} />
              </View>
              <View style={styles.memoryContent}>
                <View style={styles.memoryHeader}>
                  <Text style={styles.memoryEmoji}>{memory.emoji}</Text>
                  <View>
                    <View style={[styles.typeBadge, { backgroundColor: getTypeColor(memory.type) + "20" }]}>
                      <Text style={[styles.typeText, { color: getTypeColor(memory.type) }]}>
                        {getTypeLabel(memory.type)}
                      </Text>
                    </View>
                    <Text style={styles.memoryDate}>{memory.date}</Text>
                  </View>
                </View>
                <Text style={styles.memoryTitle}>{memory.title}</Text>
                <Text style={styles.memoryDesc}>{memory.description}</Text>
              </View>
            </View>
          ))
        ) : null}

        {/* Empty encouragement */}
        <View style={styles.encouragement}>
          <Text style={styles.encourageEmoji}>✨</Text>
          <Text style={styles.encourageTitle}>Vos souvenirs se construisent ici</Text>
          <Text style={styles.encourageText}>
            Chaque livre terminé, chaque défi réalisé, chaque moment partagé s'ajoute à l'histoire de votre famille.
            {"\n\n"}
            Plus vous utilisez NOO, plus cette galerie devient précieuse.
          </Text>
        </View>

        {/* Stats placeholder */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Livres lus</Text>
            <Text style={styles.statEmoji}>📚</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Défis réalisés</Text>
            <Text style={styles.statEmoji}>🏆</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Photos</Text>
            <Text style={styles.statEmoji}>📸</Text>
          </View>
        </View>

        <View style={styles.futureNote}>
          <Text style={styles.futureIcon}>💝</Text>
          <Text style={styles.futureText}>
            Imaginez cette galerie dans 5 ans...{"\n"}
            Tous les livres lus, les défis partagés, les moments vécus.{"\n"}
            C'est ça, NOO.
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F2" },
  content: { flex: 1, padding: 16 },

  // Header
  header: { alignItems: "center", paddingVertical: 20 },
  headerEmoji: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#333" },
  headerSubtitle: { fontSize: 14, color: "#888", textAlign: "center", marginTop: 4 },

  // Memory Card
  memoryCard: { flexDirection: "row", marginBottom: 4 },
  timeline: { alignItems: "center", width: 30 },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 4 },
  line: { flex: 1, width: 2, backgroundColor: "#E0E0E0", marginVertical: 4 },
  memoryContent: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginLeft: 10,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  memoryHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  memoryEmoji: { fontSize: 28, marginRight: 12 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: "flex-start" },
  typeText: { fontSize: 11, fontWeight: "600" },
  memoryDate: { fontSize: 12, color: "#999", marginTop: 2 },
  memoryTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 4 },
  memoryDesc: { fontSize: 14, color: "#666", lineHeight: 20 },

  // Encouragement
  encouragement: {
    backgroundColor: "#D0EDE9",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginVertical: 16,
  },
  encourageEmoji: { fontSize: 36, marginBottom: 10 },
  encourageTitle: { fontSize: 18, fontWeight: "bold", color: "#2A7C6F", marginBottom: 8 },
  encourageText: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22 },

  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statNumber: { fontSize: 28, fontWeight: "bold", color: "#2A7C6F" },
  statLabel: { fontSize: 11, color: "#888", marginTop: 2 },
  statEmoji: { fontSize: 20, marginTop: 6 },

  // Future note
  futureNote: {
    backgroundColor: "#FFF0F5",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  futureIcon: { fontSize: 28, marginBottom: 8 },
  futureText: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22, fontStyle: "italic" },
});
