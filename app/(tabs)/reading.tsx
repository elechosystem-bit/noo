import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Linking,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { type Book, type ReadingEntry } from "../../src/services/books";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db, auth } from "../../src/config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useFamily } from "../../src/hooks/useFamily";

interface ReadingPreference {
  tag: string;
  weight: number;
}

interface DiscoveryOption {
  label: string;
  emoji: string;
  tags: string[];
}

interface DiscoveryQuestion {
  id: string;
  question: string;
  subtitle?: string;
  type: "choice" | "multi" | "text";
  options?: DiscoveryOption[];
}

interface PostReadingQuestion {
  id: string;
  question: string;
  type: "choice" | "text";
  options?: DiscoveryOption[];
}

const discoveryQuestions: DiscoveryQuestion[] = [
  {
    id: "mood",
    question: "En ce moment, tu as plutôt envie de...",
    subtitle: "Il n'y a pas de mauvaise réponse !",
    type: "choice",
    options: [
      { label: "Rire et m'amuser", emoji: "😂", tags: ["humour", "aventure"] },
      { label: "Voyager loin d'ici", emoji: "🌍", tags: ["voyage", "aventure", "fantasy"] },
      { label: "Frissonner un peu", emoji: "😱", tags: ["suspense", "mystère"] },
      { label: "Apprendre des choses", emoji: "🧠", tags: ["science", "documentaire"] },
      { label: "Être ému(e)", emoji: "🥹", tags: ["émotion", "amitié", "famille"] },
      { label: "Je ne sais pas trop", emoji: "🤷", tags: [] },
    ],
  },
  {
    id: "genre",
    question: "Qu'est-ce qui t'attire le plus ?",
    subtitle: "Tu peux en choisir plusieurs",
    type: "multi",
    options: [
      { label: "Aventure & action", emoji: "⚔️", tags: ["aventure", "action"] },
      { label: "Histoires vraies", emoji: "📰", tags: ["biographie"] },
      { label: "Magie & fantastique", emoji: "🧙", tags: ["fantasy", "magie"] },
      { label: "Animaux & nature", emoji: "🐾", tags: ["animaux", "nature"] },
      { label: "Science & espace", emoji: "🚀", tags: ["science", "sf"] },
      { label: "Amour & amitié", emoji: "💕", tags: ["romance", "amitié"] },
      { label: "Enquêtes & mystères", emoji: "🔍", tags: ["policier", "mystère"] },
      { label: "BD & manga", emoji: "💬", tags: ["bd", "manga"] },
    ],
  },
  {
    id: "length",
    question: "Tu préfères les livres plutôt...",
    type: "choice",
    options: [
      { label: "Courts — vite lus !", emoji: "📄", tags: ["court"] },
      { label: "Moyens — le bon format", emoji: "📕", tags: ["moyen"] },
      { label: "Longs — j'adore m'y plonger", emoji: "📚", tags: ["long"] },
      { label: "Peu importe !", emoji: "🤷", tags: [] },
    ],
  },
  {
    id: "last_book",
    question: "Le dernier livre que tu as vraiment aimé ?",
    subtitle: "Même si c'était il y a longtemps. Si tu ne te souviens pas, passe !",
    type: "text",
  },
  {
    id: "dislike",
    question: "Et à l'inverse, ce que tu n'aimes PAS dans un livre ?",
    subtitle: "Ça nous aide à éviter les mauvaises surprises",
    type: "multi",
    options: [
      { label: "Trop de descriptions", emoji: "😴", tags: ["pas-descriptif"] },
      { label: "Trop triste", emoji: "😢", tags: ["pas-triste"] },
      { label: "Trop compliqué", emoji: "🤯", tags: ["pas-complexe"] },
      { label: "Trop enfantin", emoji: "👶", tags: ["pas-enfantin"] },
      { label: "Pas assez d'action", emoji: "🐌", tags: ["pas-lent"] },
      { label: "Tout me va !", emoji: "😊", tags: [] },
    ],
  },
];

function getPostReadingFlow(bookTitle: string): PostReadingQuestion[] {
  return [
    {
      id: "feeling",
      question: `Qu'est-ce que "${bookTitle}" t'a fait ressentir ?`,
      type: "choice",
      options: [
        { label: "De la joie", emoji: "😊", tags: ["aime-humour"] },
        { label: "De l'émotion", emoji: "🥹", tags: ["aime-émotion"] },
        { label: "De l'excitation", emoji: "🤩", tags: ["aime-aventure"] },
        { label: "De la curiosité", emoji: "🤔", tags: ["aime-réflexion"] },
        { label: "De l'ennui", emoji: "😐", tags: ["pas-ce-genre"] },
      ],
    },
    {
      id: "best_part",
      question: "Qu'est-ce que tu as préféré ?",
      type: "choice",
      options: [
        { label: "Les personnages", emoji: "👤", tags: ["aime-personnages"] },
        { label: "L'histoire", emoji: "📖", tags: ["aime-intrigue"] },
        { label: "L'univers / le décor", emoji: "🌎", tags: ["aime-univers"] },
        { label: "Le style d'écriture", emoji: "✍️", tags: ["aime-style"] },
        { label: "La fin", emoji: "🎬", tags: ["aime-suspense"] },
      ],
    },
    {
      id: "similar",
      question: "Tu aimerais relire quelque chose de similaire ?",
      type: "choice",
      options: [
        { label: "Oui, encore !", emoji: "🔁", tags: ["plus-du-même"] },
        { label: "Oui mais différent", emoji: "🔀", tags: ["varier"] },
        { label: "Non, changer complètement", emoji: "🆕", tags: ["changer"] },
      ],
    },
    {
      id: "share",
      question: "Tu le conseillerais à qui dans la famille ?",
      type: "text",
    },
  ];
}

function buildPreferencesFromAnswers(answers: Record<string, string | string[]>): ReadingPreference[] {
  const tagCounts: Record<string, number> = {};
  for (const [questionId, answer] of Object.entries(answers)) {
    const question = discoveryQuestions.find((q) => q.id === questionId);
    if (!question?.options) continue;
    const selectedLabels = Array.isArray(answer) ? answer : [answer];
    for (const label of selectedLabels) {
      const option = question.options.find((o) => o.label === label);
      if (option) {
        for (const tag of option.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
  }
  return Object.entries(tagCounts).map(([tag, count]) => ({ tag, weight: Math.min(count, 3) }));
}

type Tab = "discover" | "library" | "family";

export default function Reading() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [library, setLibrary] = useState<ReadingEntry[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [preferences, setPreferences] = useState<ReadingPreference[]>([]);

  // Discovery flow
  const [profileComplete, setProfileComplete] = useState(false);
  const [discoveryStep, setDiscoveryStep] = useState(0);
  const [discoveryAnswers, setDiscoveryAnswers] = useState<Record<string, string | string[]>>({});
  const [multiSelections, setMultiSelections] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState("");

  // AI recommendations
  const [aiBooks, setAiBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);

  // Finish reading flow
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishingEntry, setFinishingEntry] = useState<ReadingEntry | null>(null);
  const [postReadingStep, setPostReadingStep] = useState(0);
  const [postReadingAnswers, setPostReadingAnswers] = useState<Record<string, string>>({});
  const [postReadingText, setPostReadingText] = useState("");

  const currentQuestion: DiscoveryQuestion | undefined = discoveryQuestions[discoveryStep];
  const { familyId } = useFamily();
  const userId = auth.currentUser?.uid;

  // Load data from Firestore on mount
  useEffect(() => {
    if (!userId) return;
    const loadData = async () => {
      try {
        const ref = doc(db, "users", userId, "reading", "profile");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.profileComplete) setProfileComplete(true);
          if (data.preferences) setPreferences(data.preferences);
          if (data.library) {
            setLibrary(data.library.map((e: any) => ({
              ...e,
              startedAt: e.startedAt?.toDate ? e.startedAt.toDate() : e.startedAt ? new Date(e.startedAt) : undefined,
              finishedAt: e.finishedAt?.toDate ? e.finishedAt.toDate() : e.finishedAt ? new Date(e.finishedAt) : undefined,
            })));
          }
          if (data.aiBooks && data.aiBooks.length > 0) setAiBooks(data.aiBooks);
        }
      } catch (e) {
        console.error("Error loading reading data:", e);
      }
    };
    loadData();
  }, [userId]);

  // Save data to Firestore whenever it changes
  const saveToFirestore = async (updates: Record<string, any>) => {
    if (!userId) return;
    try {
      const ref = doc(db, "users", userId, "reading", "profile");
      await setDoc(ref, updates, { merge: true });
    } catch (e) {
      console.error("Error saving reading data:", e);
    }
  };

  // Fetch AI recommendations via Cloud Function
  const fetchAIRecommendations = async (prefs: ReadingPreference[]) => {
    setLoadingBooks(true);
    try {
      const functions = getFunctions(app, "europe-west1");
      const getBooks = httpsCallable(functions, "getBookRecommendations");
      const prefTags = prefs.map((p) => p.tag);
      const readTitles = library.filter((e) => e.status === "finished").map((e) => e.book.title);

      const result = await getBooks({ preferences: prefTags, booksRead: readTitles });
      const data = result.data as { books: any[] };

      if (data.books && data.books.length > 0) {
        const books: Book[] = data.books.map((b: any, i: number) => ({
          id: "ai_" + Date.now() + "_" + i,
          title: b.title || "",
          author: b.author || "",
          description: b.description || "",
          ageRange: b.age || undefined,
          genre: b.genre || undefined,
          coverUrl: b.coverUrl || undefined,
        }));
        setAiBooks(books);
        saveToFirestore({ aiBooks: books });
      }
    } catch (error) {
      console.error("AI recommendation error:", error);
    } finally {
      setLoadingBooks(false);
    }
  };

  const openAmazon = (book: Book) => {
    const query = encodeURIComponent(book.title + " " + book.author);
    // TODO: add affiliate tag when available (e.g. &tag=noo-app-21)
    Linking.openURL("https://www.amazon.fr/s?k=" + query);
  };

  // === Discovery Flow ===
  const handleDiscoveryChoice = (label: string) => {
    const q = currentQuestion;
    if (!q) return;

    if (q.type === "multi") {
      setMultiSelections((prev) =>
        prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
      );
      return;
    }

    const newAnswers = { ...discoveryAnswers, [q.id]: label };
    setDiscoveryAnswers(newAnswers);
    goNextDiscovery(newAnswers);
  };

  const confirmMulti = () => {
    const q = currentQuestion;
    if (!q) return;
    const newAnswers = { ...discoveryAnswers, [q.id]: multiSelections };
    setDiscoveryAnswers(newAnswers);
    setMultiSelections([]);
    goNextDiscovery(newAnswers);
  };

  const confirmText = () => {
    const q = currentQuestion;
    if (!q) return;
    const newAnswers = { ...discoveryAnswers, [q.id]: textAnswer };
    setDiscoveryAnswers(newAnswers);
    setTextAnswer("");
    goNextDiscovery(newAnswers);
  };

  const goNextDiscovery = (answers: Record<string, string | string[]>) => {
    if (discoveryStep < discoveryQuestions.length - 1) {
      setDiscoveryStep((s) => s + 1);
    } else {
      const prefs = buildPreferencesFromAnswers(answers);
      setPreferences(prefs);
      setProfileComplete(true);
      saveToFirestore({ profileComplete: true, preferences: prefs });
      fetchAIRecommendations(prefs);
    }
  };

  const skipDiscovery = () => {
    setProfileComplete(true);
    saveToFirestore({ profileComplete: true, preferences: [] });
    fetchAIRecommendations([]);
  };

  // === Library ===
  const addToLibrary = (book: Book, status: ReadingEntry["status"]) => {
    if (library.find((e) => e.book.id === book.id)) return;
    const newEntry: ReadingEntry = {
      id: `entry_${Date.now()}`,
      book,
      status,
      startedAt: status === "reading" ? new Date() : undefined,
    };
    const newLib = [newEntry, ...library];
    setLibrary(newLib);
    setSelectedBook(null);
    saveToFirestore({ library: newLib.map(e => ({ ...e, startedAt: e.startedAt?.toISOString(), finishedAt: e.finishedAt?.toISOString() })) });
  };

  // === Post-reading flow ===
  const startFinishFlow = (entry: ReadingEntry) => {
    setFinishingEntry(entry);
    setPostReadingStep(0);
    setPostReadingAnswers({});
    setShowFinishModal(true);
  };

  const postReadingQuestions: PostReadingQuestion[] = finishingEntry
    ? getPostReadingFlow(finishingEntry.book.title)
    : [];
  const currentPostQuestion = postReadingQuestions[postReadingStep];

  const handlePostReadingChoice = (label: string) => {
    const q = currentPostQuestion;
    if (!q || !finishingEntry) return;

    const newAnswers = { ...postReadingAnswers, [q.id]: label };
    setPostReadingAnswers(newAnswers);

    if (postReadingStep < postReadingQuestions.length - 1) {
      setPostReadingStep((s) => s + 1);
    } else {
      completeReading(newAnswers);
    }
  };

  const submitPostText = () => {
    const q = currentPostQuestion;
    if (!q || !finishingEntry) return;

    const newAnswers = { ...postReadingAnswers, [q.id]: postReadingText };
    setPostReadingText("");

    if (postReadingStep < postReadingQuestions.length - 1) {
      setPostReadingAnswers(newAnswers);
      setPostReadingStep((s) => s + 1);
    } else {
      completeReading(newAnswers);
    }
  };

  const completeReading = (answers: Record<string, string>) => {
    if (!finishingEntry) return;

    const feeling = answers.feeling;
    let rating: ReadingEntry["rating"] = "liked";
    if (feeling === "De l'ennui") rating = "not_for_me";
    else if (feeling === "De la joie" || feeling === "De l'excitation") rating = "loved";

    const newLib = library.map((e) =>
      e.id === finishingEntry.id
        ? { ...e, status: "finished" as const, rating, finishedAt: new Date(), notes: answers.share || "" }
        : e
    );
    setLibrary(newLib);
    saveToFirestore({ library: newLib.map(e => ({ ...e, startedAt: e.startedAt?.toISOString(), finishedAt: e.finishedAt?.toISOString() })) });

    setShowFinishModal(false);
    setFinishingEntry(null);
    setPostReadingStep(0);
    setPostReadingAnswers({});
  };

  const reading = library.filter((e) => e.status === "reading");
  const finished = library.filter((e) => e.status === "finished");
  const toRead = library.filter((e) => e.status === "to_read");

  // === Renderers ===
  const renderBookCard = (book: Book) => (
    <TouchableOpacity key={book.id} style={styles.bookCard} onPress={() => setSelectedBook(book)}>
      {book.coverUrl ? (
        <Image source={{ uri: book.coverUrl }} style={styles.bookCoverImage} />
      ) : (
        <View style={styles.bookCover}>
          <Text style={styles.bookEmoji}>📖</Text>
        </View>
      )}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>{book.title}</Text>
        <Text style={styles.bookAuthor}>{book.author}</Text>
        <Text style={styles.bookDesc} numberOfLines={2}>{book.description}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
          {book.ageRange ? (
            <View style={styles.ageBadge}>
              <Text style={styles.ageBadgeText}>{book.ageRange}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.buyButton}
            onPress={(e) => { e.stopPropagation(); openAmazon(book); }}
          >
            <Text style={styles.buyButtonText}>Se le procurer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderLibraryEntry = (entry: ReadingEntry) => (
    <View key={entry.id} style={styles.bookCard}>
      <View style={styles.bookCover}>
        <Text style={styles.bookEmoji}>
          {entry.status === "finished" ? "✅" : entry.status === "reading" ? "📖" : "📚"}
        </Text>
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>{entry.book.title}</Text>
        <Text style={styles.bookAuthor}>{entry.book.author}</Text>
        {entry.rating && (
          <Text style={styles.ratingText}>
            {entry.rating === "loved" ? "❤️ Adoré" : entry.rating === "liked" ? "👍 Aimé" : "😐 Pas pour moi"}
          </Text>
        )}
        {entry.status === "reading" && (
          <TouchableOpacity style={styles.finishButton} onPress={() => startFinishFlow(entry)}>
            <Text style={styles.finishButtonText}>J'ai terminé !</Text>
          </TouchableOpacity>
        )}
        {entry.status === "to_read" && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
              const newLib = library.map((e) =>
                e.id === entry.id ? { ...e, status: "reading" as const, startedAt: new Date() } : e
              );
              setLibrary(newLib);
              saveToFirestore({ library: newLib.map(e => ({ ...e, startedAt: e.startedAt?.toISOString(), finishedAt: e.finishedAt?.toISOString() })) });
            }}
          >
            <Text style={styles.startButtonText}>Commencer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Hero header like home */}
      <View style={styles.hero}>
        <View style={styles.heroCircle1} />
        <View style={styles.heroCircle2} />
        <TouchableOpacity onPress={() => router.push("/(tabs)/feed")} style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>← Accueil</Text>
        </TouchableOpacity>
        <Text style={styles.heroTitle}>Lecture</Text>
        <Text style={styles.heroSub}>Decouvrir, lire et partager en famille</Text>
        {/* Pill tabs inside hero */}
        <View style={styles.pillRow}>
          {[
            { key: "discover" as Tab, label: "Decouvrir" },
            { key: "library" as Tab, label: "Ma biblio" },
            { key: "family" as Tab, label: "En famille" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.pill, activeTab === tab.key && styles.pillOn]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.pillText, activeTab === tab.key && styles.pillTextOn]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ===== DISCOVER TAB - QUESTIONNAIRE ===== */}
      {activeTab === "discover" && !profileComplete ? (
        <ScrollView style={styles.content}>
          <View style={{ alignItems: "center", paddingBottom: 40 }}>
            <View style={styles.discoveryProgress}>
              {discoveryQuestions.map((_, i) => (
                <View key={i} style={[styles.progressDot, i <= discoveryStep && styles.progressDotActive]} />
              ))}
            </View>

            <Text style={styles.discoveryGreeting}>
              {discoveryStep === 0
                ? "Apprenons a vous connaitre !"
                : "Question " + (discoveryStep + 1) + " sur " + discoveryQuestions.length}
            </Text>

            {currentQuestion ? (
              <View style={styles.questionCard}>
                <Text style={styles.questionText}>{currentQuestion.question}</Text>
                {currentQuestion.subtitle ? (
                  <Text style={styles.questionSubtitle}>{currentQuestion.subtitle}</Text>
                ) : null}

                {currentQuestion.type === "choice" && currentQuestion.options ? currentQuestion.options.map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={styles.optionButton}
                    onPress={() => handleDiscoveryChoice(opt.label)}
                  >
                    <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                  </TouchableOpacity>
                )) : null}

                {currentQuestion.type === "multi" && currentQuestion.options ? (
                  <View>
                    {currentQuestion.options.map((opt) => (
                      <TouchableOpacity
                        key={opt.label}
                        style={[
                          styles.optionButton,
                          multiSelections.includes(opt.label) && styles.optionSelected,
                        ]}
                        onPress={() => handleDiscoveryChoice(opt.label)}
                      >
                        <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                        <Text style={[
                          styles.optionLabel,
                          multiSelections.includes(opt.label) && styles.optionLabelSelected,
                        ]}>{opt.label}</Text>
                        {multiSelections.includes(opt.label) ? <Text style={styles.checkMark}>v</Text> : null}
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[styles.confirmButton, multiSelections.length === 0 && styles.confirmDisabled]}
                      onPress={confirmMulti}
                      disabled={multiSelections.length === 0}
                    >
                      <Text style={styles.confirmText}>
                        {"Valider (" + multiSelections.length + " choix)"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {currentQuestion.type === "text" ? (
                  <View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Tapez ici..."
                      value={textAnswer}
                      onChangeText={setTextAnswer}
                      multiline
                    />
                    <View style={styles.textActions}>
                      <TouchableOpacity style={styles.skipButton} onPress={() => {
                        setTextAnswer("");
                        goNextDiscovery(discoveryAnswers);
                      }}>
                        <Text style={styles.skipText}>Passer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.confirmButton, !textAnswer.trim() && styles.confirmDisabled]}
                        onPress={confirmText}
                        disabled={!textAnswer.trim()}
                      >
                        <Text style={styles.confirmText}>Suivant</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            <TouchableOpacity style={styles.skipAllButton} onPress={skipDiscovery}>
              <Text style={styles.skipAllText}>Passer et voir les recommandations</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}

      {activeTab === "discover" && profileComplete ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Preferences summary */}
          {preferences.length > 0 && (
            <View style={styles.prefsCard}>
              <Text style={styles.prefsTitle}>🎯 Votre profil lecture</Text>
              <View style={styles.prefsTags}>
                {preferences.map((p) => (
                  <View key={p.tag} style={styles.prefTag}>
                    <Text style={styles.prefTagText}>{p.tag}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity onPress={() => { setProfileComplete(false); setDiscoveryStep(0); setDiscoveryAnswers({}); }}>
                <Text style={styles.reDoText}>Refaire le questionnaire</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Recommandations pour vous</Text>
          <Text style={styles.sectionSubtitle}>
            {preferences.length > 0
              ? "Basees sur vos gouts par l IA"
              : "Selectionnees par votre IA familiale"}
          </Text>

          {loadingBooks ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🤖</Text>
              <Text style={{ fontSize: 16, color: "#2A7C6F", fontWeight: "600" }}>
                L IA cherche des livres pour vous...
              </Text>
              <Text style={{ fontSize: 14, color: "#999", marginTop: 6 }}>
                Cela peut prendre quelques secondes
              </Text>
            </View>
          ) : null}

          {!loadingBooks && aiBooks.length > 0 ? aiBooks.map((book) => renderBookCard(book)) : null}

          {!loadingBooks && aiBooks.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 30 }}>
              <Text style={{ fontSize: 14, color: "#888", textAlign: "center" }}>
                Les recommandations arrivent bientot...
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.confirmButton, { marginTop: 16 }, loadingBooks && styles.confirmDisabled]}
            onPress={() => fetchAIRecommendations(preferences)}
            disabled={loadingBooks}
          >
            <Text style={styles.confirmText}>Nouvelles recommandations</Text>
          </TouchableOpacity>

          <View style={styles.aiSuggestion}>
            <Text style={styles.aiIcon}>🤖</Text>
            <Text style={styles.aiText}>
              Chaque livre termine affine vos recommandations.
              Plus vous lisez, plus l IA vous connait !
            </Text>
          </View>
        </ScrollView>
      ) : null}

      {/* ===== LIBRARY TAB ===== */}
      {activeTab === "library" && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {reading.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>📖 En cours de lecture</Text>
              {reading.map(renderLibraryEntry)}
            </>
          )}
          {toRead.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>📚 À lire</Text>
              {toRead.map(renderLibraryEntry)}
            </>
          )}
          {finished.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>✅ Livres terminés ({finished.length})</Text>
              {finished.map(renderLibraryEntry)}
            </>
          )}
          {library.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>Votre bibliothèque est vide</Text>
              <Text style={styles.emptyText}>
                Explorez l'onglet Découvrir pour ajouter vos premiers livres !
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ===== FAMILY TAB ===== */}
      {activeTab === "family" && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 En ce moment dans notre famille</Text>
          {reading.length > 0 ? (
            <>
              <Text style={styles.familyReading}>Vous lisez :</Text>
              {reading.map((entry) => (
                <View key={entry.id} style={styles.familyCard}>
                  <Text style={styles.familyBookTitle}>📖 {entry.book.title}</Text>
                  <Text style={styles.familyBookAuthor}>{entry.book.author}</Text>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👨‍👩‍👧‍👦</Text>
              <Text style={styles.emptyTitle}>Rien pour l'instant</Text>
              <Text style={styles.emptyText}>
                Quand les membres de votre famille liront, vous verrez ici ce que chacun lit.
                {"\n\n"}C'est l'occasion de découvrir, partager et discuter ensemble !
              </Text>
            </View>
          )}
          <View style={styles.aiSuggestion}>
            <Text style={styles.aiIcon}>💡</Text>
            <Text style={styles.aiText}>
              Quand deux membres lisent le même livre, l'IA vous proposera d'en discuter ensemble !
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ===== BOOK DETAIL MODAL ===== */}
      <Modal visible={!!selectedBook} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBook && (
              <>
                {selectedBook.coverUrl ? (
                  <Image source={{ uri: selectedBook.coverUrl }} style={{ width: 120, height: 180, borderRadius: 10, marginBottom: 16 }} />
                ) : (
                  <Text style={styles.modalEmoji}>📖</Text>
                )}
                <Text style={styles.modalTitle}>{selectedBook.title}</Text>
                <Text style={styles.modalAuthor}>{selectedBook.author}</Text>
                <Text style={styles.modalDesc}>{selectedBook.description}</Text>
                {selectedBook.genre ? <Text style={styles.modalGenre}>Genre : {selectedBook.genre}</Text> : null}
                <TouchableOpacity style={styles.modalButton} onPress={() => addToLibrary(selectedBook, "reading")}>
                  <Text style={styles.modalButtonText}>Je le lis !</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonOutline} onPress={() => addToLibrary(selectedBook, "to_read")}>
                  <Text style={styles.modalButtonOutlineText}>A lire plus tard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#FF9900" }]}
                  onPress={() => openAmazon(selectedBook)}
                >
                  <Text style={styles.modalButtonText}>Se le procurer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setSelectedBook(null)}>
                  <Text style={styles.modalCancelText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ===== POST-READING FLOW MODAL ===== */}
      <Modal visible={showFinishModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {finishingEntry && currentPostQuestion && (
              <>
                {/* Progress */}
                <View style={styles.postProgress}>
                  {postReadingQuestions.map((_, i) => (
                    <View key={i} style={[styles.progressDot, i <= postReadingStep && styles.progressDotActive]} />
                  ))}
                </View>

                <Text style={styles.modalEmoji}>
                  {postReadingStep === 0 ? "🎉" : "🤖"}
                </Text>

                {postReadingStep === 0 && (
                  <Text style={styles.postBravo}>
                    Bravo ! Vous avez terminé "{finishingEntry.book.title}" !
                  </Text>
                )}

                <Text style={styles.postQuestion}>{currentPostQuestion.question}</Text>

                {currentPostQuestion.type === "choice" && currentPostQuestion.options?.map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={styles.postOptionButton}
                    onPress={() => handlePostReadingChoice(opt.label)}
                  >
                    <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}

                {currentPostQuestion.type === "text" && (
                  <>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Tapez ici... (optionnel)"
                      value={postReadingText}
                      onChangeText={setPostReadingText}
                      multiline
                    />
                    <View style={styles.textActions}>
                      <TouchableOpacity style={styles.skipButton} onPress={() => {
                        setPostReadingText("");
                        if (postReadingStep < postReadingQuestions.length - 1) {
                          setPostReadingStep((s) => s + 1);
                        } else {
                          completeReading(postReadingAnswers);
                        }
                      }}>
                        <Text style={styles.skipText}>Passer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.confirmButton} onPress={submitPostText}>
                        <Text style={styles.confirmText}>Valider</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => { setShowFinishModal(false); setFinishingEntry(null); }}
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

  // Hero header
  hero: {
    backgroundColor: "#2A7C6F",
    paddingTop: Platform.OS === "ios" ? 14 : 10,
    paddingBottom: 18,
    paddingHorizontal: 22,
    position: "relative",
    overflow: "hidden",
  },
  heroCircle1: { position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.06)" },
  heroCircle2: { position: "absolute", bottom: -20, left: -10, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.04)" },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#fff", fontStyle: "italic", marginBottom: 4 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 14 },

  // Pill tabs
  pillRow: { flexDirection: "row", gap: 8 },
  pill: { backgroundColor: "rgba(255,255,255,0.15)", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  pillOn: { backgroundColor: "rgba(255,255,255,0.95)", borderColor: "transparent" },
  pillText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  pillTextOn: { color: "#2A7C6F" },

  // Content
  content: { flex: 1, padding: 18 },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: "#B0978A", marginBottom: 10, letterSpacing: 0.8, textTransform: "uppercase" },
  sectionSubtitle: { fontSize: 14, color: "#7A6055", marginBottom: 16 },

  // Discovery
  discoveryContainer: { alignItems: "center", paddingBottom: 40 },
  discoveryProgress: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EDE3D5", marginHorizontal: 4 },
  progressDotActive: { backgroundColor: "#2A7C6F", width: 24, borderRadius: 4 },
  discoveryGreeting: { fontSize: 16, fontWeight: "800", color: "#2A7C6F", textAlign: "center", marginBottom: 4 },

  questionCard: { backgroundColor: "#fff", borderRadius: 24, padding: 22, width: "100%", borderWidth: 1, borderColor: "rgba(107,78,61,0.1)", shadowColor: "rgba(44,31,20,0.08)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 20, elevation: 3 },
  questionText: { fontSize: 20, fontWeight: "800", color: "#2C1F14", textAlign: "center", marginBottom: 6 },
  questionSubtitle: { fontSize: 14, color: "#B0978A", textAlign: "center", marginBottom: 20 },

  optionButton: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    padding: 16, borderRadius: 18, marginBottom: 10, borderWidth: 2, borderColor: "rgba(107,78,61,0.1)",
    shadowColor: "rgba(44,31,20,0.08)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  optionSelected: { borderColor: "#2A7C6F", backgroundColor: "#D0EDE9", shadowColor: "rgba(42,124,111,0.2)", shadowRadius: 16 },
  optionEmoji: { fontSize: 26, marginRight: 14 },
  optionLabel: { fontSize: 15, fontWeight: "700", color: "#2C1F14", flex: 1 },
  optionLabelSelected: { color: "#2A7C6F", fontWeight: "800" },
  checkMark: { fontSize: 18, color: "#2A7C6F", fontWeight: "bold" },

  confirmButton: { backgroundColor: "#2A7C6F", paddingVertical: 16, borderRadius: 18, alignItems: "center", marginTop: 14, shadowColor: "rgba(42,124,111,0.35)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 20, elevation: 6 },
  confirmDisabled: { opacity: 0.4 },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  textInput: { backgroundColor: "#F5EFE6", padding: 16, borderRadius: 16, fontSize: 16, minHeight: 80, textAlignVertical: "top", marginTop: 12, borderWidth: 2, borderColor: "transparent" },
  textActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 12 },
  skipButton: { paddingVertical: 14, paddingHorizontal: 20 },
  skipText: { color: "#999", fontSize: 15 },

  skipAllButton: { marginTop: 20, padding: 12 },
  skipAllText: { color: "#999", fontSize: 14, textDecorationLine: "underline" },

  // Preferences card
  prefsCard: { backgroundColor: "#D0EDE9", borderRadius: 16, padding: 18, marginBottom: 20 },
  prefsTitle: { fontSize: 16, fontWeight: "bold", color: "#2A7C6F", marginBottom: 10 },
  prefsTags: { flexDirection: "row", flexWrap: "wrap" },
  prefTag: { backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, margin: 3 },
  prefTagText: { fontSize: 13, color: "#2A7C6F" },
  reDoText: { color: "#999", fontSize: 13, marginTop: 10, textDecorationLine: "underline" },

  // Book Card
  bookCard: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 24, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "rgba(107,78,61,0.1)",
    shadowColor: "rgba(44,31,20,0.08)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 20, elevation: 2,
  },
  bookCover: { width: 70, height: 100, backgroundColor: "#F5EFE6", borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 14 },
  bookCoverImage: { width: 70, height: 100, borderRadius: 10, marginRight: 14 },
  buyButton: { backgroundColor: "#C9933A", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, shadowColor: "rgba(201,147,58,0.3)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
  buyButtonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  bookEmoji: { fontSize: 32 },
  bookInfo: { flex: 1, justifyContent: "center" },
  bookTitle: { fontSize: 16, fontWeight: "800", color: "#2C1F14", marginBottom: 2 },
  bookAuthor: { fontSize: 14, color: "#2A7C6F", marginBottom: 6 },
  bookDesc: { fontSize: 13, color: "#777", lineHeight: 18 },
  ageBadge: { alignSelf: "flex-start", backgroundColor: "#D0EDE9", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
  ageBadgeText: { fontSize: 11, color: "#2A7C6F", fontWeight: "600" },

  ratingText: { fontSize: 13, color: "#2A7C6F", marginTop: 4 },

  finishButton: { backgroundColor: "#2A7C6F", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, alignSelf: "flex-start", marginTop: 8 },
  finishButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  startButton: { backgroundColor: "#D0EDE9", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, alignSelf: "flex-start", marginTop: 8 },
  startButtonText: { color: "#2A7C6F", fontSize: 13, fontWeight: "600" },

  // AI Suggestion
  aiSuggestion: { flexDirection: "row", backgroundColor: "#D0EDE9", borderRadius: 16, padding: 16, marginTop: 12, marginBottom: 24, alignItems: "flex-start" },
  aiIcon: { fontSize: 24, marginRight: 12 },
  aiText: { flex: 1, fontSize: 14, color: "#555", lineHeight: 20 },

  // Empty
  empty: { alignItems: "center", marginTop: 60 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", color: "#555", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22, paddingHorizontal: 20 },

  // Family
  familyReading: { fontSize: 16, color: "#555", marginTop: 12, marginBottom: 8 },
  familyCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: "#2A7C6F" },
  familyBookTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  familyBookAuthor: { fontSize: 13, color: "#888", marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(44,31,20,0.6)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FBF7F2", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 26, alignItems: "center", maxHeight: "85%", borderTopWidth: 1, borderTopColor: "rgba(107,78,61,0.1)" },
  modalEmoji: { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#2C1F14", marginBottom: 4 },
  modalAuthor: { fontSize: 16, color: "#B0978A", marginBottom: 12 },
  modalDesc: { fontSize: 14, color: "#7A6055", textAlign: "center", lineHeight: 22, marginBottom: 12 },
  modalGenre: { fontSize: 13, color: "#B0978A", marginBottom: 20 },
  modalButton: { backgroundColor: "#2A7C6F", paddingVertical: 16, paddingHorizontal: 40, borderRadius: 18, width: "100%", alignItems: "center", marginBottom: 10, shadowColor: "rgba(42,124,111,0.35)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 20, elevation: 6 },
  modalButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  modalButtonOutline: { borderWidth: 2, borderColor: "rgba(107,78,61,0.1)", paddingVertical: 14, paddingHorizontal: 40, borderRadius: 18, width: "100%", alignItems: "center", marginBottom: 10, backgroundColor: "#fff" },
  modalButtonOutlineText: { color: "#7A6055", fontSize: 16, fontWeight: "700" },
  modalCancel: { padding: 14 },
  modalCancelText: { color: "#999", fontSize: 15 },

  // Post-reading
  postProgress: { flexDirection: "row", justifyContent: "center", marginBottom: 12 },
  postBravo: { fontSize: 16, color: "#2A7C6F", fontWeight: "600", textAlign: "center", marginBottom: 16 },
  postQuestion: { fontSize: 18, fontWeight: "bold", color: "#333", textAlign: "center", marginBottom: 16 },
  postOptionButton: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#F5EFE6",
    padding: 14, borderRadius: 14, marginBottom: 8, width: "100%",
  },
});
