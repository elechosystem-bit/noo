import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Platform, Image, Linking, ActivityIndicator,
} from "react-native";
import { useFamily } from "../../src/hooks/useFamily";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../src/config/firebase";
import { askClaude } from "../../src/services/ai";
import { getGamesForFamily, getPhilibertUrl, type BoardGame } from "../../src/services/boardgames";
import { collection, getDocs } from "firebase/firestore";

// ── Types & Data ───────────────────────────────────────────────────────
interface Challenge {
  id: string; title: string; description: string; emoji: string;
  difficulty: "facile" | "moyen" | "aventurier"; ageRange: string;
}

const PASTEL = ["#FEF3C7", "#D5F5E3", "#D6EAF8"];
const diffColors: Record<string, string> = { facile: "#4CAF50", moyen: "#FF9800", aventurier: "#E91E63" };

const weeklyChallenges: Challenge[] = [
  { id: "ch_1", title: "Soiree jeux de societe", description: "Choisissez un jeu que personne n'a essaye et jouez-y tous ensemble ce weekend !", emoji: "🎲", difficulty: "facile", ageRange: "Toute la famille" },
  { id: "ch_2", title: "Cuisine du monde", description: "Preparez ensemble un plat d'un pays que vous n'avez jamais visite.", emoji: "🌍", difficulty: "moyen", ageRange: "Toute la famille" },
  { id: "ch_3", title: "Balade photo nature", description: "Sortez en famille et chaque membre doit photographier 3 choses belles.", emoji: "📸", difficulty: "facile", ageRange: "Toute la famille" },
];
const sortiesSuggestions: Challenge[] = [
  { id: "s_1", title: "Visite au musee", description: "Trouvez un musee pres de chez vous. Chacun choisit son oeuvre preferee.", emoji: "🏛️", difficulty: "facile", ageRange: "6+" },
  { id: "s_2", title: "Pique-nique lecture", description: "Chacun apporte le livre qu'il lit. Lisez ensemble en plein air.", emoji: "🧺", difficulty: "facile", ageRange: "Toute la famille" },
  { id: "s_3", title: "Chasse au tresor", description: "Creez des indices et cachez un petit tresor dans le quartier !", emoji: "🗺️", difficulty: "moyen", ageRange: "Toute la famille" },
];

// Sorties questionnaire
const STEP2_OPTIONS: Record<string, string[]> = {
  "Decouvrir quelque chose de nouveau": ["Musee", "Exposition", "Visite guidee", "Conference", "Surprise-moi"],
  "Rire et s'amuser ensemble": ["Spectacle", "Theatre", "Cirque", "Festival", "Surprise-moi"],
  "S'emerveiller et etre surpris": ["Expo immersive", "Planetarium", "Danse", "Magie", "Surprise-moi"],
  "Apprendre et se cultiver": ["Musee", "Exposition", "Visite guidee", "Conference", "Surprise-moi"],
};

type MainTab = "defis" | "sorties";

// ── Component ──────────────────────────────────────────────────────────
export default function Challenges() {
  const { familyId } = useFamily();
  const [mainTab, setMainTab] = useState<MainTab>("defis");
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [note, setNote] = useState("");
  const [city, setCity] = useState("Paris");

  // Board games
  const [games, setGames] = useState<BoardGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [showMoreGames, setShowMoreGames] = useState(false);

  // Explore challenge
  const [showExplore, setShowExplore] = useState(false);
  const [exploreChallenge, setExploreChallenge] = useState<Challenge | null>(null);
  const [exploreSuggestions, setExploreSuggestions] = useState("");
  const [exploreLoading, setExploreLoading] = useState(false);
  const [showAsk, setShowAsk] = useState(false);
  const [askCity, setAskCity] = useState("");
  const [askAges, setAskAges] = useState("");

  // Sorties questionnaire
  const [sortieStep, setSortieStep] = useState(0);
  const [sortieAnswers, setSortieAnswers] = useState<string[]>([]);
  const [sortieLoading, setSortieLoading] = useState(false);
  const [sortieDone, setSortieDone] = useState(false);
  const [sortieSuggestions, setSortieSuggestions] = useState("");

  // Load city + board games
  useEffect(() => {
    if (!familyId) return;
    (async () => {
      try {
        const famDoc = await getDoc(doc(db, "families", familyId));
        if (famDoc.exists() && famDoc.data().city) setCity(famDoc.data().city);

        // Load family members for board game recommendation
        const membersSnap = await getDocs(collection(db, "families", familyId, "members"));
        const members = membersSnap.docs.map((d) => {
          const data = d.data();
          return { name: data.name || "", age: data.age || 10 };
        });
        if (members.length > 0) {
          const g = await getGamesForFamily(members);
          setGames(g);
        }
      } catch (e) { console.error(e); }
      finally { setGamesLoading(false); }
    })();
  }, [familyId]);

  // ── Explore defi ─────────────────────────────────────────────────
  const exploreDefi = (c: Challenge) => {
    setExploreChallenge(c); setAskCity(city); setAskAges(""); setShowAsk(true);
  };

  const launchExplore = async () => {
    if (!askCity.trim() || !exploreChallenge) return;
    setShowAsk(false); setShowExplore(true); setExploreLoading(true);
    setExploreSuggestions("");
    const userCity = askCity.trim(); const ages = askAges.trim(); setCity(userCity);
    if (familyId) setDoc(doc(db, "families", familyId), { city: userCity }, { merge: true }).catch(() => {});
    const ageInfo = ages ? ` Les enfants ont ${ages}.` : "";
    try {
      const r = await askClaude(
        `Propose 3 idees concretes pour "${exploreChallenge.title}" en famille a ${userCity}.${ageInfo} Noms de lieux precis, adresses si possible. 3 lignes par idee.`,
        "Defi famille NOO"
      );
      setExploreSuggestions(r);
    } catch { setExploreSuggestions(""); }
    setExploreLoading(false);
  };

  const complete = () => {
    if (!selected) return;
    setCompletedIds((p) => new Set([...p, selected.id]));
    setShowModal(false); setSelected(null); setNote("");
  };

  // ── Sorties questionnaire ────────────────────────────────────────
  const sortieQuestions = [
    { q: "Vous avez envie de quoi ce weekend ?", options: ["Decouvrir quelque chose de nouveau", "Rire et s'amuser ensemble", "S'emerveiller et etre surpris", "Apprendre et se cultiver"] },
    { q: "Quel type de sortie ?", options: STEP2_OPTIONS[sortieAnswers[0]] || ["Musee", "Spectacle", "Expo immersive", "Surprise-moi"] },
    { q: "C'est pour quand ?", options: ["Ce weekend", "Dans 2 semaines", "Dans le mois", "Pas de contrainte"] },
    { q: "Expo ephemere ou lieu permanent ?", options: ["Temporaire", "Permanent", "Les deux"] },
  ];

  const selectSortie = (answer: string) => {
    const newAnswers = [...sortieAnswers, answer];
    setSortieAnswers(newAnswers);
    if (sortieStep < 3) {
      setSortieStep(sortieStep + 1);
    } else {
      launchSortieSearch(newAnswers);
    }
  };

  const launchSortieSearch = async (answers: string[]) => {
    setSortieLoading(true); setSortieDone(true); setSortieSuggestions("");
    try {
      const r = await askClaude(
        `Propose 4 sorties concretes pour une famille a ${city}. Envie: ${answers[0]}. Type: ${answers[1]}. Quand: ${answers[2]}. Lieu: ${answers[3]}. Pour chaque sortie donne: nom du lieu, adresse, pourquoi c'est bien en famille, et un conseil pratique. Sois precis et chaleureux.`,
        "Sorties famille NOO"
      );
      setSortieSuggestions(r);
    } catch { setSortieSuggestions("Aucune suggestion pour le moment. Essayez d'autres criteres !"); }
    setSortieLoading(false);
  };

  const resetSorties = () => {
    setSortieStep(0); setSortieAnswers([]); setSortieDone(false); setSortieSuggestions("");
  };

  // ── Card renderer ────────────────────────────────────────────────
  const Card = ({ c, i }: { c: Challenge; i: number }) => {
    const done = completedIds.has(c.id);
    return (
      <TouchableOpacity style={[S.card, { backgroundColor: done ? "#D0EDE9" : PASTEL[i % 3] }]} onPress={() => exploreDefi(c)} activeOpacity={0.85}>
        <View style={S.cardTop}>
          <Text style={S.cardEmoji}>{c.emoji}</Text>
          <View style={S.cardBadges}>
            <View style={[S.badge, { backgroundColor: diffColors[c.difficulty] + "20" }]}>
              <Text style={[S.badgeText, { color: diffColors[c.difficulty] }]}>{c.difficulty}</Text>
            </View>
            <Text style={S.ageText}>{c.ageRange}</Text>
          </View>
        </View>
        <Text style={S.cardTitle}>{done ? "✅ " : ""}{c.title}</Text>
        <Text style={S.cardDesc}>{c.description}</Text>
        {!done ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <TouchableOpacity style={S.joinBtn} onPress={(e) => { e.stopPropagation(); setSelected(c); setShowModal(true); }} activeOpacity={0.8}>
              <Text style={S.joinText}>Je participe !</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.joinBtn, { backgroundColor: "rgba(42,124,111,0.15)" }]} onPress={(e) => { e.stopPropagation(); exploreDefi(c); }} activeOpacity={0.8}>
              <Text style={[S.joinText, { color: "#2A7C6F" }]}>Explorer</Text>
            </TouchableOpacity>
          </View>
        ) : <Text style={S.doneText}>Bravo a toute la famille !</Text>}
      </TouchableOpacity>
    );
  };

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <View style={S.container}>
      {/* Hero */}
      <View style={S.hero}>
        <View style={S.c1} /><View style={S.c2} />
        <Text style={S.heroTitle}>Defis & Sorties</Text>
        <Text style={S.heroSub}>Activites a faire ensemble</Text>
        <View style={S.pills}>
          <TouchableOpacity style={[S.pill, mainTab === "defis" && S.pillOn]} onPress={() => setMainTab("defis")}>
            <Text style={[S.pillT, mainTab === "defis" && S.pillTOn]}>Defis</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.pill, mainTab === "sorties" && S.pillOn]} onPress={() => setMainTab("sorties")}>
            <Text style={[S.pillT, mainTab === "sorties" && S.pillTOn]}>Sorties</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ DEFIS TAB ═══ */}
      {mainTab === "defis" ? (
        <ScrollView style={S.scroll} contentContainerStyle={S.scrollInner} showsVerticalScrollIndicator={false}>
          {/* Jeu de la semaine */}
          {gamesLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <ActivityIndicator color="#2A7C6F" size="small" />
              <Text style={{ color: "#B0978A", marginTop: 6, fontSize: 12 }}>Recherche du jeu ideal...</Text>
            </View>
          ) : games.length > 0 ? (
            <View style={{ marginBottom: 20 }}>
              <Text style={S.section}>JEU DE LA SEMAINE</Text>
              {/* First game - featured */}
              <View style={S.gameCard}>
                {games[0].image ? <Image source={{ uri: games[0].image }} style={S.gameImg} /> : null}
                <View style={S.gameBody}>
                  <Text style={S.gameTitle}>{games[0].title}</Text>
                  <Text style={S.gameDesc}>{games[0].description}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <View style={S.gameBadge}><Text style={S.gameBadgeText}>{games[0].minPlayers}-{games[0].maxPlayers} joueurs</Text></View>
                    <View style={S.gameBadge}><Text style={S.gameBadgeText}>Des {games[0].minAge} ans</Text></View>
                    {games[0].rating > 0 ? <View style={[S.gameBadge, { backgroundColor: "#FEF3C7" }]}><Text style={[S.gameBadgeText, { color: "#92400E" }]}>{"★".repeat(Math.round(games[0].rating / 2))} {games[0].rating.toFixed(1)}</Text></View> : null}
                  </View>
                  <TouchableOpacity style={S.gameBtn} onPress={() => Linking.openURL(getPhilibertUrl(games[0].title))} activeOpacity={0.85}>
                    <Text style={S.gameBtnText}>Acheter sur Philibert</Text>
                  </TouchableOpacity>
                  {games.length > 1 ? (
                    <TouchableOpacity onPress={() => setShowMoreGames(!showMoreGames)} style={{ marginTop: 10 }}>
                      <Text style={{ color: "#2A7C6F", fontSize: 13, fontWeight: "700" }}>{showMoreGames ? "Masquer les autres" : "Voir d'autres suggestions"}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              {/* Other games */}
              {showMoreGames ? games.slice(1).map((g) => (
                <View key={g.id} style={S.gameCardSmall}>
                  {g.image ? <Image source={{ uri: g.image }} style={S.gameImgSmall} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={S.gameTitle}>{g.title}</Text>
                    <Text style={S.gameDescSmall}>{g.description}</Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                      <View style={S.gameBadge}><Text style={S.gameBadgeText}>{g.minPlayers}-{g.maxPlayers} j.</Text></View>
                      <View style={S.gameBadge}><Text style={S.gameBadgeText}>{g.minAge}+ ans</Text></View>
                      {g.rating > 0 ? <View style={[S.gameBadge, { backgroundColor: "#FEF3C7" }]}><Text style={[S.gameBadgeText, { color: "#92400E" }]}>{g.rating.toFixed(1)}</Text></View> : null}
                    </View>
                    <TouchableOpacity style={[S.gameBtn, { marginTop: 8, paddingVertical: 8 }]} onPress={() => Linking.openURL(getPhilibertUrl(g.title))} activeOpacity={0.85}>
                      <Text style={[S.gameBtnText, { fontSize: 12 }]}>Acheter</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )) : null}
            </View>
          ) : null}

          <Text style={S.section}>CETTE SEMAINE</Text>
          {weeklyChallenges.map((c, i) => <Card key={c.id} c={c} i={i} />)}
          <Text style={[S.section, { marginTop: 20 }]}>IDEES DE SORTIES</Text>
          {sortiesSuggestions.map((c, i) => <Card key={c.id} c={c} i={i} />)}
          <View style={S.score}>
            <Text style={{ fontSize: 40 }}>🌟</Text>
            <Text style={S.scoreNum}>{completedIds.size}</Text>
            <Text style={S.scoreLbl}>{completedIds.size === 0 ? "Lancez votre premier defi !" : "defis realises"}</Text>
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      ) : null}

      {/* ═══ SORTIES TAB ═══ */}
      {mainTab === "sorties" ? (
        <ScrollView style={S.scroll} contentContainerStyle={S.scrollInner} showsVerticalScrollIndicator={false}>
          {!sortieDone ? (
            <View style={{ alignItems: "center", paddingBottom: 30 }}>
              {/* Progress bar */}
              <View style={S.progBar}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[S.progSeg, i <= sortieStep && S.progSegOn]} />
                ))}
              </View>

              <Text style={S.sortieQ}>{sortieQuestions[sortieStep].q}</Text>

              {sortieQuestions[sortieStep].options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[S.sortieOpt, sortieAnswers[sortieStep] === opt && S.sortieOptSel]}
                  onPress={() => selectSortie(opt)}
                  activeOpacity={0.85}
                >
                  <Text style={[S.sortieOptText, sortieAnswers[sortieStep] === opt && S.sortieOptTextSel]}>{opt}</Text>
                </TouchableOpacity>
              ))}

              {sortieStep > 0 ? (
                <TouchableOpacity onPress={() => { setSortieStep(sortieStep - 1); setSortieAnswers(sortieAnswers.slice(0, -1)); }} style={{ marginTop: 16, padding: 10 }}>
                  <Text style={{ color: "#B0978A", fontSize: 14 }}>← Question precedente</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View>
              {/* Criteria summary */}
              <TouchableOpacity style={S.changeCriteria} onPress={resetSorties} activeOpacity={0.8}>
                <Text style={S.changeCriteriaText}>Changer mes criteres</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {sortieAnswers.map((a, i) => (
                  <View key={i} style={S.criteriaTag}><Text style={S.criteriaTagText}>{a}</Text></View>
                ))}
              </View>

              {sortieLoading ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <ActivityIndicator color="#2A7C6F" size="large" />
                  <Text style={{ color: "#B0978A", marginTop: 10, fontSize: 14 }}>L'IA cherche des sorties a {city}...</Text>
                </View>
              ) : sortieSuggestions ? (
                <View style={{ backgroundColor: "#fff", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(107,78,61,0.08)", shadowColor: "rgba(44,31,20,0.06)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 }}>
                  <Text style={{ fontSize: 14, color: "#2C1F14", lineHeight: 24 }}>{sortieSuggestions}</Text>
                </View>
              ) : null}
              <View style={{ height: 30 }} />
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* ═══ MODALS ═══ */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={S.modalBg}><View style={S.modal}>
          <Text style={{ fontSize: 48, marginBottom: 8 }}>🎉</Text>
          <Text style={S.modalTitle}>Bravo !</Text>
          <Text style={S.modalSub}>{selected?.title}</Text>
          <TextInput style={S.modalInput} placeholder="Comment ca s'est passe ? (optionnel)" value={note} onChangeText={setNote} multiline />
          <TouchableOpacity style={S.modalBtn} onPress={complete} activeOpacity={0.85}><Text style={S.modalBtnText}>Valider le defi</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowModal(false); setSelected(null); }} style={{ padding: 14 }}><Text style={{ color: "#B0978A", fontSize: 15 }}>Annuler</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={showAsk} animationType="slide" transparent>
        <View style={S.modalBg}><View style={S.modal}>
          <Text style={{ fontSize: 48, marginBottom: 8 }}>{exploreChallenge?.emoji}</Text>
          <Text style={S.modalTitle}>{exploreChallenge?.title}</Text>
          <Text style={{ fontSize: 14, color: "#7A6055", marginBottom: 20, textAlign: "center" }}>Pour vous proposer les meilleures idees</Text>
          <Text style={S.askLabel}>DANS QUELLE VILLE ETES-VOUS ?</Text>
          <TextInput style={S.modalInput} placeholder="Ex: Lyon, Marseille..." placeholderTextColor="#B0978A" value={askCity} onChangeText={setAskCity} />
          <Text style={S.askLabel}>AGE DES ENFANTS (optionnel)</Text>
          <TextInput style={S.modalInput} placeholder="Ex: 5 ans et 9 ans" placeholderTextColor="#B0978A" value={askAges} onChangeText={setAskAges} />
          <TouchableOpacity style={[S.modalBtn, !askCity.trim() && { opacity: 0.4 }]} onPress={launchExplore} disabled={!askCity.trim()} activeOpacity={0.85}><Text style={S.modalBtnText}>Trouver des idees</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAsk(false)} style={{ padding: 14 }}><Text style={{ color: "#B0978A", fontSize: 15 }}>Annuler</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={showExplore} animationType="slide" transparent>
        <View style={S.modalBg}><View style={[S.modal, { maxHeight: "90%" }]}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 48, marginBottom: 8 }}>{exploreChallenge?.emoji}</Text>
              <Text style={S.modalTitle}>{exploreChallenge?.title}</Text>
              <Text style={{ fontSize: 14, color: "#7A6055", marginBottom: 16, textAlign: "center" }}>{exploreChallenge?.description}</Text>
            </View>
            {exploreLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 30 }}>
                <ActivityIndicator color="#2A7C6F" size="large" />
                <Text style={{ color: "#B0978A", marginTop: 10, fontSize: 14 }}>L'IA cherche des idees...</Text>
              </View>
            ) : (<>
              {exploreSuggestions ? (
                <View style={{ backgroundColor: "#D0EDE9", borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "rgba(42,124,111,0.15)" }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#2A7C6F", marginBottom: 8, letterSpacing: 0.5 }}>SUGGESTIONS DE L'IA</Text>
                  <Text style={{ fontSize: 14, color: "#1F5C52", lineHeight: 22 }}>{exploreSuggestions}</Text>
                </View>
              ) : null}
            </>)}
            <TouchableOpacity style={[S.modalBtn, { marginTop: 8 }]} onPress={() => { setShowExplore(false); setSelected(exploreChallenge); setShowModal(true); }} activeOpacity={0.85}><Text style={S.modalBtnText}>Je participe !</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowExplore(false)} style={{ padding: 14, alignItems: "center" }}><Text style={{ color: "#B0978A", fontSize: 15 }}>Fermer</Text></TouchableOpacity>
          </ScrollView>
        </View></View>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F2" },
  hero: { backgroundColor: "#2A7C6F", paddingTop: Platform.OS === "ios" ? 56 : 36, paddingBottom: 20, paddingHorizontal: 22, position: "relative", overflow: "hidden" },
  c1: { position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.06)" },
  c2: { position: "absolute", bottom: -20, left: -10, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.04)" },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#fff", fontStyle: "italic", marginBottom: 4 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 14 },

  pills: { flexDirection: "row", gap: 8 },
  pill: { backgroundColor: "rgba(255,255,255,0.15)", paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  pillOn: { backgroundColor: "rgba(255,255,255,0.95)", borderColor: "transparent" },
  pillT: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  pillTOn: { color: "#2A7C6F" },

  scroll: { flex: 1 },
  scrollInner: { padding: 18, paddingBottom: 30 },
  section: { fontSize: 11, fontWeight: "800", color: "#B0978A", letterSpacing: 0.8, marginBottom: 12 },

  // Challenge cards
  card: { borderRadius: 24, padding: 20, marginBottom: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardEmoji: { fontSize: 40 },
  cardBadges: { alignItems: "flex-end" },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginBottom: 4 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  ageText: { fontSize: 11, color: "#7A6055" },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#2C1F14", marginBottom: 6 },
  cardDesc: { fontSize: 14, color: "#4A3728", lineHeight: 21 },
  joinBtn: { backgroundColor: "rgba(255,255,255,0.7)", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 16 },
  joinText: { fontSize: 14, fontWeight: "800", color: "#2C1F14" },
  doneText: { color: "#2A7C6F", fontSize: 14, fontWeight: "700", marginTop: 12 },

  score: { backgroundColor: "#D0EDE9", borderRadius: 24, padding: 28, alignItems: "center", marginTop: 16 },
  scoreNum: { fontSize: 52, fontWeight: "900", color: "#2A7C6F" },
  scoreLbl: { fontSize: 14, color: "#7A6055", textAlign: "center" },

  // Sorties questionnaire
  progBar: { flexDirection: "row", gap: 6, marginBottom: 28, width: "100%" },
  progSeg: { flex: 1, height: 6, borderRadius: 4, backgroundColor: "#EDE3D5" },
  progSegOn: { backgroundColor: "#2A7C6F" },

  sortieQ: { fontSize: 22, fontWeight: "900", color: "#2C1F14", textAlign: "center", marginBottom: 20 },
  sortieOpt: {
    backgroundColor: "#fff", borderRadius: 20, padding: 18, width: "100%", marginBottom: 10,
    borderWidth: 2, borderColor: "rgba(107,78,61,0.08)",
    shadowColor: "rgba(44,31,20,0.06)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 2,
  },
  sortieOptSel: { borderColor: "#2A7C6F", backgroundColor: "#D0EDE9" },
  sortieOptText: { fontSize: 16, fontWeight: "700", color: "#2C1F14" },
  sortieOptTextSel: { color: "#1F5C52" },

  // Board games
  gameCard: { backgroundColor: "#fff", borderRadius: 24, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: "rgba(107,78,61,0.08)", shadowColor: "rgba(44,31,20,0.06)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 },
  gameImg: { width: "100%", height: 160 },
  gameBody: { padding: 16 },
  gameTitle: { fontSize: 17, fontWeight: "800", color: "#2C1F14", marginBottom: 4 },
  gameDesc: { fontSize: 13, color: "#7A6055", lineHeight: 19 },
  gameDescSmall: { fontSize: 12, color: "#7A6055", lineHeight: 17, marginTop: 2 },
  gameBadge: { backgroundColor: "#D0EDE9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  gameBadgeText: { fontSize: 11, fontWeight: "700", color: "#2A7C6F" },
  gameBtn: { backgroundColor: "#2A7C6F", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14, alignSelf: "flex-start", marginTop: 12 },
  gameBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  gameCardSmall: { backgroundColor: "#fff", borderRadius: 20, padding: 14, marginBottom: 10, flexDirection: "row", gap: 12, borderWidth: 1, borderColor: "rgba(107,78,61,0.08)" },
  gameImgSmall: { width: 70, height: 70, borderRadius: 14 },

  demoBanner: { backgroundColor: "#FEF3C7", borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "#FDE68A" },
  demoBannerText: { fontSize: 13, fontWeight: "700", color: "#92400E", textAlign: "center" },

  changeCriteria: { backgroundColor: "#F5EFE6", borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, alignSelf: "flex-start", marginBottom: 12 },
  changeCriteriaText: { fontSize: 13, fontWeight: "800", color: "#7A6055" },
  criteriaTag: { backgroundColor: "#D0EDE9", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  criteriaTagText: { fontSize: 12, fontWeight: "700", color: "#2A7C6F" },

  // Events
  eventCard: { borderRadius: 24, marginBottom: 14, overflow: "hidden" },
  eventImg: { width: "100%", height: 140, borderRadius: 16, margin: 12, marginBottom: 0 },
  eventTitle: { fontSize: 17, fontWeight: "800", color: "#2C1F14", marginBottom: 4 },
  eventDate: { fontSize: 13, fontWeight: "700", color: "#2A7C6F", marginBottom: 2 },
  eventLoc: { fontSize: 13, color: "#7A6055", marginBottom: 6 },
  eventDesc: { fontSize: 13, color: "#4A3728", lineHeight: 19, marginBottom: 10 },
  eventBtn: { backgroundColor: "#2A7C6F", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14, alignSelf: "flex-start" },
  eventBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  // Modals
  modalBg: { flex: 1, backgroundColor: "rgba(44,31,20,0.6)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#FBF7F2", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 26, alignItems: "center" },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#2C1F14" },
  modalSub: { fontSize: 16, color: "#7A6055", marginBottom: 16, textAlign: "center" },
  modalInput: { backgroundColor: "#F5EFE6", padding: 14, borderRadius: 16, width: "100%", minHeight: 60, fontSize: 14, textAlignVertical: "top", marginBottom: 16 },
  modalBtn: { backgroundColor: "#2A7C6F", paddingVertical: 16, borderRadius: 18, width: "100%", alignItems: "center", marginBottom: 8, shadowColor: "rgba(42,124,111,0.35)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 20, elevation: 6 },
  modalBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  askLabel: { fontSize: 11, fontWeight: "800", color: "#B0978A", letterSpacing: 0.8, marginBottom: 6, alignSelf: "flex-start" },
});
