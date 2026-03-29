import { useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
} from "react-native";

interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  difficulty: "facile" | "moyen" | "aventurier";
  category: "sortie" | "maison" | "créatif" | "sport";
  ageRange: string;
  completed?: boolean;
  completedNote?: string;
}

const weeklyChallenges: Challenge[] = [
  {
    id: "ch_1",
    title: "Soirée jeux de société",
    description: "Choisissez un jeu que personne n'a essayé et jouez-y tous ensemble ce weekend !",
    emoji: "🎲",
    difficulty: "facile",
    category: "maison",
    ageRange: "Toute la famille",
  },
  {
    id: "ch_2",
    title: "Cuisine du monde",
    description: "Préparez ensemble un plat d'un pays que vous n'avez jamais visité. Chaque membre choisit un ingrédient !",
    emoji: "🌍",
    difficulty: "moyen",
    category: "créatif",
    ageRange: "Toute la famille",
  },
  {
    id: "ch_3",
    title: "Balade photo nature",
    description: "Sortez en famille et chaque membre doit photographier 3 choses belles dans la nature. Comparez vos trouvailles !",
    emoji: "📸",
    difficulty: "facile",
    category: "sortie",
    ageRange: "Toute la famille",
  },
];

const sortiesSuggestions: Challenge[] = [
  {
    id: "sort_1",
    title: "Visite au musée",
    description: "Trouvez un musée près de chez vous avec une expo temporaire. Chacun choisit son œuvre préférée et explique pourquoi.",
    emoji: "🏛️",
    difficulty: "facile",
    category: "sortie",
    ageRange: "6+",
  },
  {
    id: "sort_2",
    title: "Pique-nique lecture",
    description: "Chacun apporte le livre qu'il est en train de lire. Lisez ensemble en plein air, puis partagez un passage que vous aimez.",
    emoji: "🧺",
    difficulty: "facile",
    category: "sortie",
    ageRange: "Toute la famille",
  },
  {
    id: "sort_3",
    title: "Chasse au trésor dans le quartier",
    description: "Créez des indices ensemble et cachez un petit trésor. Les plus jeunes cherchent, les plus grands guident !",
    emoji: "🗺️",
    difficulty: "moyen",
    category: "sortie",
    ageRange: "Toute la famille",
  },
];

const difficultyColors = {
  facile: "#4CAF50",
  moyen: "#FF9800",
  aventurier: "#E91E63",
};

export default function Challenges() {
  const router = useRouter();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [completionNote, setCompletionNote] = useState("");

  const completeChallenge = () => {
    if (!selectedChallenge) return;
    setCompletedIds((prev) => new Set([...prev, selectedChallenge.id]));
    setShowCompleteModal(false);
    setSelectedChallenge(null);
    setCompletionNote("");
  };

  const renderChallenge = (challenge: Challenge) => {
    const isCompleted = completedIds.has(challenge.id);
    return (
      <View key={challenge.id} style={[styles.challengeCard, isCompleted && styles.completedCard]}>
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeEmoji}>{challenge.emoji}</Text>
          <View style={styles.challengeBadges}>
            <View style={[styles.diffBadge, { backgroundColor: difficultyColors[challenge.difficulty] + "20" }]}>
              <Text style={[styles.diffText, { color: difficultyColors[challenge.difficulty] }]}>
                {challenge.difficulty}
              </Text>
            </View>
            <Text style={styles.ageText}>{challenge.ageRange}</Text>
          </View>
        </View>
        <Text style={styles.challengeTitle}>
          {isCompleted ? "✅ " : ""}{challenge.title}
        </Text>
        <Text style={styles.challengeDesc}>{challenge.description}</Text>
        {!isCompleted && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => {
              setSelectedChallenge(challenge);
              setShowCompleteModal(true);
            }}
          >
            <Text style={styles.completeButtonText}>On l'a fait ! 🎉</Text>
          </TouchableOpacity>
        )}
        {isCompleted && (
          <Text style={styles.completedText}>Bravo à toute la famille ! 🌟</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{backgroundColor:"#2A7C6F",paddingTop:14,paddingBottom:18,paddingHorizontal:22,position:"relative",overflow:"hidden"}}>
        <View style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:60,backgroundColor:"rgba(255,255,255,0.06)"}}/>
        <TouchableOpacity onPress={() => router.push("/(tabs)/feed")} style={{marginBottom:8}}><Text style={{fontSize:14,color:"rgba(255,255,255,0.7)",fontWeight:"700"}}>← Accueil</Text></TouchableOpacity>
        <Text style={{fontSize:26,fontWeight:"800",color:"#fff",fontStyle:"italic",marginBottom:4}}>Defis</Text>
        <Text style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}>Activites a faire ensemble</Text>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Cette semaine</Text>
        <Text style={styles.sectionSubtitle}>
          Proposés par votre IA familiale — à faire ensemble !
        </Text>
        {weeklyChallenges.map(renderChallenge)}

        {/* Idées de sorties */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>🧭 Idées de sorties</Text>
        <Text style={styles.sectionSubtitle}>
          Des moments à vivre ensemble hors des écrans
        </Text>
        {sortiesSuggestions.map(renderChallenge)}

        {/* Score famille */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreEmoji}>🌟</Text>
          <Text style={styles.scoreTitle}>Score famille</Text>
          <Text style={styles.scoreNumber}>{completedIds.size}</Text>
          <Text style={styles.scoreLabel}>
            {completedIds.size === 0
              ? "Lancez-vous dans votre premier défi !"
              : completedIds.size === 1
              ? "défi réalisé — super début !"
              : `défis réalisés — quelle famille !`}
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Complete Modal */}
      <Modal visible={showCompleteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={styles.modalTitle}>Bravo !</Text>
            <Text style={styles.modalSubtitle}>
              {selectedChallenge?.title}
            </Text>

            <TextInput
              style={styles.noteInput}
              placeholder="Racontez comment ça s'est passé ! (optionnel)"
              value={completionNote}
              onChangeText={setCompletionNote}
              multiline
            />

            <TouchableOpacity style={styles.modalButton} onPress={completeChallenge}>
              <Text style={styles.modalButtonText}>Valider le défi ✅</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => {
                setShowCompleteModal(false);
                setSelectedChallenge(null);
              }}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F2" },
  content: { flex: 1, padding: 16 },

  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: "#888", marginBottom: 16 },

  challengeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  completedCard: { backgroundColor: "#F0FFF0", borderWidth: 1, borderColor: "#C8E6C9" },

  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  challengeEmoji: { fontSize: 36 },
  challengeBadges: { alignItems: "flex-end" },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  diffText: { fontSize: 12, fontWeight: "600" },
  ageText: { fontSize: 11, color: "#999" },

  challengeTitle: { fontSize: 17, fontWeight: "bold", color: "#333", marginBottom: 6 },
  challengeDesc: { fontSize: 14, color: "#666", lineHeight: 20 },

  completeButton: {
    backgroundColor: "#2A7C6F",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  completeButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  completedText: { color: "#4CAF50", fontSize: 14, fontWeight: "600", marginTop: 10 },

  // Score
  scoreCard: {
    backgroundColor: "#D0EDE9",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginTop: 12,
  },
  scoreEmoji: { fontSize: 40, marginBottom: 8 },
  scoreTitle: { fontSize: 14, color: "#2A7C6F", fontWeight: "600" },
  scoreNumber: { fontSize: 48, fontWeight: "bold", color: "#2A7C6F" },
  scoreLabel: { fontSize: 14, color: "#888", textAlign: "center" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  modalEmoji: { fontSize: 48, marginBottom: 8 },
  modalTitle: { fontSize: 24, fontWeight: "bold", color: "#333" },
  modalSubtitle: { fontSize: 16, color: "#666", marginBottom: 16, textAlign: "center" },
  noteInput: {
    backgroundColor: "#F5EFE6",
    padding: 14,
    borderRadius: 12,
    width: "100%",
    minHeight: 80,
    fontSize: 14,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: "#2A7C6F",
    paddingVertical: 14,
    borderRadius: 30,
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  modalButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  modalCancel: { padding: 14 },
  modalCancelText: { color: "#999", fontSize: 15 },
});
