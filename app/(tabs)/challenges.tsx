import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Platform, Image, Linking, ActivityIndicator,
} from "react-native";
import { getLocalEvents, type LocalEvent } from "../../src/services/events";
import { useFamily } from "../../src/hooks/useFamily";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../src/config/firebase";
import { askClaude } from "../../src/services/ai";

interface Challenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  difficulty: "facile" | "moyen" | "aventurier";
  ageRange: string;
}

const PASTEL = ["#FEF3C7", "#D5F5E3", "#D6EAF8"];

const weeklyChallenges: Challenge[] = [
  { id: "ch_1", title: "Soiree jeux de societe", description: "Choisissez un jeu que personne n'a essaye et jouez-y tous ensemble ce weekend !", emoji: "🎲", difficulty: "facile", ageRange: "Toute la famille" },
  { id: "ch_2", title: "Cuisine du monde", description: "Preparez ensemble un plat d'un pays que vous n'avez jamais visite. Chaque membre choisit un ingredient !", emoji: "🌍", difficulty: "moyen", ageRange: "Toute la famille" },
  { id: "ch_3", title: "Balade photo nature", description: "Sortez en famille et chaque membre doit photographier 3 choses belles dans la nature.", emoji: "📸", difficulty: "facile", ageRange: "Toute la famille" },
];

const sortiesSuggestions: Challenge[] = [
  { id: "s_1", title: "Visite au musee", description: "Trouvez un musee pres de chez vous. Chacun choisit son oeuvre preferee et explique pourquoi.", emoji: "🏛️", difficulty: "facile", ageRange: "6+" },
  { id: "s_2", title: "Pique-nique lecture", description: "Chacun apporte le livre qu'il lit. Lisez ensemble en plein air, puis partagez un passage.", emoji: "🧺", difficulty: "facile", ageRange: "Toute la famille" },
  { id: "s_3", title: "Chasse au tresor", description: "Creez des indices et cachez un petit tresor. Les plus jeunes cherchent, les grands guident !", emoji: "🗺️", difficulty: "moyen", ageRange: "Toute la famille" },
];

const diffColors: Record<string, string> = { facile: "#4CAF50", moyen: "#FF9800", aventurier: "#E91E63" };

export default function Challenges() {
  const { familyId } = useFamily();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [note, setNote] = useState("");
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [city, setCity] = useState("Paris");

  // Explore challenge
  const [showExplore, setShowExplore] = useState(false);
  const [exploreChallenge, setExploreChallenge] = useState<Challenge | null>(null);
  const [exploreSuggestions, setExploreSuggestions] = useState("");
  const [exploreEvents, setExploreEvents] = useState<LocalEvent[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);

  // Ask step before explore
  const [showAsk, setShowAsk] = useState(false);
  const [askCity, setAskCity] = useState("");
  const [askAges, setAskAges] = useState("");

  useEffect(() => {
    (async () => {
      try {
        let c = "Paris";
        if (familyId) {
          const famDoc = await getDoc(doc(db, "families", familyId));
          if (famDoc.exists() && famDoc.data().city) {
            c = famDoc.data().city;
          }
        }
        setCity(c);
        const ev = await getLocalEvents(c);
        setEvents(ev);
      } catch (e) { console.error(e); }
      finally { setEventsLoading(false); }
    })();
  }, [familyId]);

  const exploreDefi = (c: Challenge) => {
    setExploreChallenge(c);
    setAskCity(city);
    setAskAges("");
    setShowAsk(true);
  };

  const launchExplore = async () => {
    if (!askCity.trim() || !exploreChallenge) return;
    setShowAsk(false);
    setShowExplore(true);
    setExploreLoading(true);
    setExploreSuggestions("");
    setExploreEvents([]);

    const userCity = askCity.trim();
    const ages = askAges.trim();
    setCity(userCity);

    // Save city to family profile
    if (familyId) {
      setDoc(doc(db, "families", familyId), { city: userCity }, { merge: true }).catch(() => {});
    }

    const searchTerm = exploreChallenge.title.replace(/[^a-zA-ZÀ-ÿ ]/g, "").trim();
    const evPromise = getLocalEvents(userCity + " " + searchTerm).then((ev) => setExploreEvents(ev)).catch(() => {});

    const ageInfo = ages ? ` Les enfants ont ${ages}.` : "";
    const aiPromise = askClaude(
      `Propose 3 idees concretes et pratiques pour realiser le defi "${exploreChallenge.title}" en famille a ${userCity}.${ageInfo} Pour chaque idee donne un nom de lieu precis, l'adresse si possible, et pourquoi c'est adapte aux enfants. 3-4 lignes par idee. Sois chaleureux et precis.`,
      "Defi famille NOO"
    ).then((r) => setExploreSuggestions(r)).catch(() => setExploreSuggestions(""));

    await Promise.all([evPromise, aiPromise]);
    setExploreLoading(false);
  };

  const complete = () => {
    if (!selected) return;
    setCompletedIds((p) => new Set([...p, selected.id]));
    setShowModal(false);
    setSelected(null);
    setNote("");
  };

  const Card = ({ c, i }: { c: Challenge; i: number }) => {
    const done = completedIds.has(c.id);
    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: done ? "#D0EDE9" : PASTEL[i % 3] }]} onPress={() => exploreDefi(c)} activeOpacity={0.85}>
        <View style={styles.cardTop}>
          <Text style={styles.cardEmoji}>{c.emoji}</Text>
          <View style={styles.cardBadges}>
            <View style={[styles.badge, { backgroundColor: diffColors[c.difficulty] + "20" }]}>
              <Text style={[styles.badgeText, { color: diffColors[c.difficulty] }]}>{c.difficulty}</Text>
            </View>
            <Text style={styles.ageText}>{c.ageRange}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{done ? "✅ " : ""}{c.title}</Text>
        <Text style={styles.cardDesc}>{c.description}</Text>
        {!done ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <TouchableOpacity style={styles.joinBtn} onPress={(e) => { e.stopPropagation(); setSelected(c); setShowModal(true); }} activeOpacity={0.8}>
              <Text style={styles.joinText}>Je participe !</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.joinBtn, { backgroundColor: "rgba(42,124,111,0.15)" }]} onPress={(e) => { e.stopPropagation(); exploreDefi(c); }} activeOpacity={0.8}>
              <Text style={[styles.joinText, { color: "#2A7C6F" }]}>Explorer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.doneText}>Bravo a toute la famille !</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <Text style={styles.heroTitle}>Defis</Text>
        <Text style={styles.heroSub}>Activites a faire ensemble</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>CETTE SEMAINE</Text>
        {weeklyChallenges.map((c, i) => <Card key={c.id} c={c} i={i} />)}

        <Text style={[styles.section, { marginTop: 20 }]}>IDEES DE SORTIES</Text>
        {sortiesSuggestions.map((c, i) => <Card key={c.id} c={c} i={i} />)}

        <Text style={[styles.section, { marginTop: 20 }]}>SORTIES & SPECTACLES</Text>
        {eventsLoading ? (
          <View style={{ alignItems: "center", paddingVertical: 30 }}>
            <ActivityIndicator color="#2A7C6F" size="large" />
            <Text style={{ color: "#B0978A", marginTop: 10, fontSize: 14 }}>Recherche d'evenements pres de chez vous...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: "center", marginBottom: 14, borderWidth: 1, borderColor: "rgba(107,78,61,0.08)" }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>🎭</Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#7A6055", textAlign: "center" }}>Aucun evenement pres de chez vous</Text>
            <Text style={{ fontSize: 13, color: "#B0978A", textAlign: "center", marginTop: 4 }}>Revenez bientot !</Text>
          </View>
        ) : events.map((ev, i) => (
          <View key={ev.id} style={[styles.eventCard, { backgroundColor: PASTEL[i % 3] }]}>
            {ev.imageUrl ? (
              <Image source={{ uri: ev.imageUrl }} style={styles.eventImg} />
            ) : null}
            <View style={{ padding: 16 }}>
              <Text style={styles.eventTitle}>{ev.title}</Text>
              {ev.date ? (
                <Text style={styles.eventDate}>
                  {new Date(ev.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </Text>
              ) : null}
              <Text style={styles.eventLocation}>{ev.location}</Text>
              {ev.description ? <Text style={styles.eventDesc} numberOfLines={2}>{ev.description}</Text> : null}
              <TouchableOpacity style={styles.eventBtn} onPress={() => Linking.openURL(ev.url)} activeOpacity={0.85}>
                <Text style={styles.eventBtnText}>En savoir plus</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.score}>
          <Text style={{ fontSize: 40 }}>🌟</Text>
          <Text style={styles.scoreNum}>{completedIds.size}</Text>
          <Text style={styles.scoreLbl}>
            {completedIds.size === 0 ? "Lancez votre premier defi !" : "defis realises"}
          </Text>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>🎉</Text>
            <Text style={styles.modalTitle}>Bravo !</Text>
            <Text style={styles.modalSub}>{selected?.title}</Text>
            <TextInput style={styles.modalInput} placeholder="Comment ca s'est passe ? (optionnel)" value={note} onChangeText={setNote} multiline />
            <TouchableOpacity style={styles.modalBtn} onPress={complete} activeOpacity={0.85}>
              <Text style={styles.modalBtnText}>Valider le defi</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowModal(false); setSelected(null); }} style={{ padding: 14 }}>
              <Text style={{ color: "#B0978A", fontSize: 15 }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ask city & ages modal */}
      <Modal visible={showAsk} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>{exploreChallenge?.emoji}</Text>
            <Text style={styles.modalTitle}>{exploreChallenge?.title}</Text>
            <Text style={{ fontSize: 14, color: "#7A6055", marginBottom: 20, textAlign: "center" }}>
              Pour vous proposer les meilleures idees
            </Text>

            <Text style={styles.askLabel}>DANS QUELLE VILLE ETES-VOUS ?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Lyon, Marseille, Bordeaux..."
              placeholderTextColor="#B0978A"
              value={askCity}
              onChangeText={setAskCity}
            />

            <Text style={styles.askLabel}>AGE DES ENFANTS (optionnel)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 5 ans et 9 ans"
              placeholderTextColor="#B0978A"
              value={askAges}
              onChangeText={setAskAges}
            />

            <TouchableOpacity
              style={[styles.modalBtn, !askCity.trim() && { opacity: 0.4 }]}
              onPress={launchExplore}
              disabled={!askCity.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnText}>Trouver des idees</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowAsk(false)} style={{ padding: 14 }}>
              <Text style={{ color: "#B0978A", fontSize: 15 }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Explore modal */}
      <Modal visible={showExplore} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { maxHeight: "90%" }]}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 48, marginBottom: 8 }}>{exploreChallenge?.emoji}</Text>
                <Text style={styles.modalTitle}>{exploreChallenge?.title}</Text>
                <Text style={{ fontSize: 14, color: "#7A6055", marginBottom: 16, textAlign: "center" }}>{exploreChallenge?.description}</Text>
              </View>

              {exploreLoading ? (
                <View style={{ alignItems: "center", paddingVertical: 30 }}>
                  <ActivityIndicator color="#2A7C6F" size="large" />
                  <Text style={{ color: "#B0978A", marginTop: 10, fontSize: 14 }}>L'IA cherche des idees pour vous...</Text>
                </View>
              ) : (
                <>
                  {/* AI suggestions */}
                  {exploreSuggestions ? (
                    <View style={{ backgroundColor: "#D0EDE9", borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "rgba(42,124,111,0.15)" }}>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: "#2A7C6F", marginBottom: 8, letterSpacing: 0.5 }}>SUGGESTIONS DE L'IA</Text>
                      <Text style={{ fontSize: 14, color: "#1F5C52", lineHeight: 22 }}>{exploreSuggestions}</Text>
                    </View>
                  ) : null}

                  {/* Related events */}
                  {exploreEvents.length > 0 ? (
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: "#B0978A", marginBottom: 10, letterSpacing: 0.5 }}>EVENEMENTS PRES DE CHEZ VOUS</Text>
                      {exploreEvents.map((ev, i) => (
                        <View key={ev.id} style={[styles.eventCard, { backgroundColor: PASTEL[i % 3] }]}>
                          {ev.imageUrl ? <Image source={{ uri: ev.imageUrl }} style={styles.eventImg} /> : null}
                          <View style={{ padding: 14 }}>
                            <Text style={styles.eventTitle}>{ev.title}</Text>
                            {ev.date ? (
                              <Text style={styles.eventDate}>
                                {new Date(ev.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                              </Text>
                            ) : null}
                            <Text style={styles.eventLocation}>{ev.location}</Text>
                            <TouchableOpacity style={styles.eventBtn} onPress={() => Linking.openURL(ev.url)} activeOpacity={0.85}>
                              <Text style={styles.eventBtnText}>En savoir plus</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              )}

              <TouchableOpacity
                style={[styles.modalBtn, { marginTop: 8 }]}
                onPress={() => { setShowExplore(false); setSelected(exploreChallenge); setShowModal(true); }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnText}>Je participe !</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowExplore(false)} style={{ padding: 14, alignItems: "center" }}>
                <Text style={{ color: "#B0978A", fontSize: 15 }}>Fermer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F2" },
  hero: { backgroundColor: "#2A7C6F", paddingTop: Platform.OS === "ios" ? 56 : 36, paddingBottom: 20, paddingHorizontal: 22, position: "relative", overflow: "hidden" },
  circle1: { position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.06)" },
  circle2: { position: "absolute", bottom: -20, left: -10, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.04)" },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#fff", fontStyle: "italic", marginBottom: 4 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.6)" },
  scroll: { flex: 1 },
  scrollInner: { padding: 18, paddingBottom: 30 },
  section: { fontSize: 11, fontWeight: "800", color: "#B0978A", letterSpacing: 0.8, marginBottom: 12 },

  card: { borderRadius: 24, padding: 20, marginBottom: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardEmoji: { fontSize: 40 },
  cardBadges: { alignItems: "flex-end" },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginBottom: 4 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  ageText: { fontSize: 11, color: "#7A6055" },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#2C1F14", marginBottom: 6 },
  cardDesc: { fontSize: 14, color: "#4A3728", lineHeight: 21 },
  joinBtn: { backgroundColor: "rgba(255,255,255,0.7)", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 16, alignSelf: "flex-start", marginTop: 14 },
  joinText: { fontSize: 14, fontWeight: "800", color: "#2C1F14" },
  doneText: { color: "#2A7C6F", fontSize: 14, fontWeight: "700", marginTop: 12 },

  score: { backgroundColor: "#D0EDE9", borderRadius: 24, padding: 28, alignItems: "center", marginTop: 16 },
  scoreNum: { fontSize: 52, fontWeight: "900", color: "#2A7C6F" },
  scoreLbl: { fontSize: 14, color: "#7A6055", textAlign: "center" },

  modalBg: { flex: 1, backgroundColor: "rgba(44,31,20,0.6)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#FBF7F2", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 26, alignItems: "center" },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#2C1F14" },
  modalSub: { fontSize: 16, color: "#7A6055", marginBottom: 16, textAlign: "center" },
  modalInput: { backgroundColor: "#F5EFE6", padding: 14, borderRadius: 16, width: "100%", minHeight: 80, fontSize: 14, textAlignVertical: "top", marginBottom: 16 },
  modalBtn: { backgroundColor: "#2A7C6F", paddingVertical: 16, borderRadius: 18, width: "100%", alignItems: "center", marginBottom: 8, shadowColor: "rgba(42,124,111,0.35)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 20, elevation: 6 },
  modalBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  askLabel: { fontSize: 11, fontWeight: "800", color: "#B0978A", letterSpacing: 0.8, marginBottom: 6, alignSelf: "flex-start" },

  // Events
  eventCard: { borderRadius: 24, marginBottom: 14, overflow: "hidden" },
  eventImg: { width: "100%", height: 140, borderRadius: 16, margin: 12, marginBottom: 0, alignSelf: "center" },
  eventTitle: { fontSize: 17, fontWeight: "800", color: "#2C1F14", marginBottom: 4 },
  eventDate: { fontSize: 13, fontWeight: "700", color: "#2A7C6F", marginBottom: 2 },
  eventLocation: { fontSize: 13, color: "#7A6055", marginBottom: 6 },
  eventDesc: { fontSize: 13, color: "#4A3728", lineHeight: 19, marginBottom: 10 },
  eventBtn: { backgroundColor: "#2A7C6F", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14, alignSelf: "flex-start" },
  eventBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
