import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Image, Linking, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { type Book, type ReadingEntry } from "../../src/services/books";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db, auth } from "../../src/config/firebase";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { useFamily } from "../../src/hooks/useFamily";
import { askClaude } from "../../src/services/ai";

// ── Types ──────────────────────────────────────────────────────────────
type AgeGroup = "child" | "teen" | "adult";
type Tab = "discover" | "library" | "family";

interface Q {
  id: string;
  question: string;
  type: "choice" | "multi" | "text";
  options?: string[];
}

// ── Questions par profil ───────────────────────────────────────────────
const QUESTIONS: Record<AgeGroup, Q[]> = {
  child: [
    { id: "animals", question: "Tu aimes les histoires avec des animaux ?", type: "choice", options: ["Oui j'adore", "Bof", "Pas trop"] },
    { id: "length", question: "Tu preferes les livres ?", type: "choice", options: ["Courts et rapides", "Moyens", "Les gros paves"] },
    { id: "genre", question: "Ton type d'histoire prefere ?", type: "choice", options: ["Aventure", "Drole", "Magique", "Effrayant"] },
    { id: "hero", question: "Ton heros prefere c'est plutot ?", type: "choice", options: ["Un enfant comme moi", "Un animal", "Un super-heros", "Un personnage magique"] },
  ],
  teen: [
    { id: "fiction", question: "Tu preferes les histoires vraies ou inventees ?", type: "choice", options: ["Vraies", "Inventees", "Les deux"] },
    { id: "surprise", question: "Le dernier livre qui t'a vraiment surpris ?", type: "text" },
    { id: "why", question: "Tu lis plutot pour ?", type: "choice", options: ["Te detendre", "Penser", "Les deux", "Je sais pas trop"] },
    { id: "dislike", question: "Ce que tu n'aimes pas dans un livre ?", type: "multi", options: ["Trop previsible", "Trop lent", "Trop de descriptions", "Trop triste", "Trop complique"] },
    { id: "try", question: "Un genre que tu n'as jamais essaye mais qui te tente ?", type: "text" },
  ],
  adult: [
    { id: "why", question: "Vous lisez plutot pour ?", type: "choice", options: ["Vous echapper", "Mieux comprendre le monde", "Les deux"] },
    { id: "changed", question: "Un livre qui a change votre facon de voir les choses ?", type: "text" },
    { id: "dislike", question: "Ce que vous ne supportez pas dans un roman ?", type: "multi", options: ["Les fins previsibles", "Les longueurs", "Les personnages superficiels", "Les happy ends trop faciles", "Le style trop simple"] },
    { id: "try", question: "Un genre que vous n'avez jamais essaye mais qui vous tente ?", type: "text" },
    { id: "abandon", question: "Vous preferez finir un livre decevant ou l'abandonner ?", type: "choice", options: ["Le finir", "L'abandonner sans culpabilite"] },
  ],
};

// Post-lecture par profil
function getPostQuestions(ageGroup: AgeGroup, _bookTitle: string): Q[] {
  if (ageGroup === "child") {
    return []; // child uses AI-generated quiz
  }
  if (ageGroup === "teen") {
    return [
      { id: "best", question: "Ce que tu as prefere dans ce livre ?", type: "text" },
      { id: "character", question: "Un personnage qui t'a marque et pourquoi ?", type: "text" },
      { id: "recommend", question: "Tu le conseillerais a qui dans la famille ?", type: "text" },
    ];
  }
  return [
    { id: "changed", question: "Ce livre vous a-t-il change quelque chose ?", type: "text" },
    { id: "recommend", question: "Vous le recommanderiez a un membre de la famille ? Lequel et pourquoi ?", type: "text" },
  ];
}

function detectAgeGroup(age?: number): AgeGroup {
  if (!age || age >= 16) return "adult";
  if (age >= 11) return "teen";
  return "child";
}

// ── Component ──────────────────────────────────────────────────────────
export default function Reading() {
  const router = useRouter();
  const { familyId } = useFamily();
  const userId = auth.currentUser?.uid;

  // Age detection
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adult");
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [library, setLibrary] = useState<ReadingEntry[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [preferences, setPreferences] = useState<Record<string, string | string[]>>({});

  // Discovery
  const [profileComplete, setProfileComplete] = useState(false);
  const [step, setStep] = useState(0);
  const [multiSel, setMultiSel] = useState<string[]>([]);
  const [textVal, setTextVal] = useState("");

  // AI books
  const [aiBooks, setAiBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);

  // Post-reading
  const [showFinish, setShowFinish] = useState(false);
  const [finEntry, setFinEntry] = useState<ReadingEntry | null>(null);
  const [postStep, setPostStep] = useState(0);
  const [postAnswers, setPostAnswers] = useState<Record<string, string>>({});
  const [postText, setPostText] = useState("");
  // Child quiz
  const [childQuiz, setChildQuiz] = useState<{ q: string; options: string[] }[]>([]);
  const [childQuizAnswers, setChildQuizAnswers] = useState<string[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  const questions = QUESTIONS[ageGroup];
  const currentQ = questions[step];

  // ── Load from Firestore ────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const ref = doc(db, "users", userId, "readingProfile", "data");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data();
          if (d.ageGroup) setAgeGroup(d.ageGroup);
          if (d.profileComplete) setProfileComplete(true);
          if (d.preferences) setPreferences(d.preferences);
          if (d.library) {
            setLibrary(d.library.map((e: any) => ({
              ...e,
              startedAt: e.startedAt ? new Date(e.startedAt) : undefined,
              finishedAt: e.finishedAt ? new Date(e.finishedAt) : undefined,
            })));
          }
          if (d.aiBooks?.length > 0) setAiBooks(d.aiBooks);
        }
        // Try detect age from family members
        if (familyId) {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const age = userDoc.data().age;
            if (age) setAgeGroup(detectAgeGroup(age));
          }
        }
      } catch (e) { console.error(e); }
    })();
  }, [userId, familyId]);

  // ── Save to Firestore ──────────────────────────────────────────────
  const save = async (updates: Record<string, any>) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, "users", userId, "readingProfile", "data"), updates, { merge: true });
    } catch (e) { console.error(e); }
  };

  // ── AI Recommendations ────────────────────────────────────────────
  const fetchRecos = async (prefs: Record<string, string | string[]>) => {
    setLoadingBooks(true);
    try {
      const functions = getFunctions(app, "europe-west1");
      const getBooks = httpsCallable(functions, "getBookRecommendations");
      const prefStr = Object.values(prefs).flat().filter(Boolean);
      const readTitles = library.filter((e) => e.status === "finished").map((e) => e.book.title);
      const result = await getBooks({ preferences: prefStr, booksRead: readTitles });
      const data = result.data as { books: any[] };
      if (data.books?.length > 0) {
        const books: Book[] = data.books.map((b: any, i: number) => ({
          id: "ai_" + Date.now() + "_" + i, title: b.title || "", author: b.author || "",
          description: b.description || "", ageRange: b.age, genre: b.genre, coverUrl: b.coverUrl,
        }));
        setAiBooks(books);
        save({ aiBooks: books });
      }
    } catch (e) { console.error(e); }
    finally { setLoadingBooks(false); }
  };

  // ── Discovery Flow ────────────────────────────────────────────────
  const selectChoice = (label: string) => {
    if (!currentQ) return;
    if (currentQ.type === "multi") {
      setMultiSel((p) => p.includes(label) ? p.filter((l) => l !== label) : [...p, label]);
      return;
    }
    const newPrefs = { ...preferences, [currentQ.id]: label };
    setPreferences(newPrefs);
    goNext(newPrefs);
  };

  const confirmMulti = () => {
    if (!currentQ) return;
    const newPrefs = { ...preferences, [currentQ.id]: multiSel };
    setPreferences(newPrefs);
    setMultiSel([]);
    goNext(newPrefs);
  };

  const confirmText = () => {
    if (!currentQ) return;
    const newPrefs = { ...preferences, [currentQ.id]: textVal };
    setPreferences(newPrefs);
    setTextVal("");
    goNext(newPrefs);
  };

  const goNext = (prefs: Record<string, string | string[]>) => {
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
    } else {
      setProfileComplete(true);
      save({ ageGroup, profileComplete: true, preferences: prefs });
      fetchRecos(prefs);
    }
  };

  const skip = () => {
    setProfileComplete(true);
    save({ ageGroup, profileComplete: true, preferences: {} });
    fetchRecos({});
  };

  // ── Library ───────────────────────────────────────────────────────
  const addToLib = (book: Book, status: ReadingEntry["status"]) => {
    if (library.find((e) => e.book.id === book.id)) return;
    const entry: ReadingEntry = { id: `e_${Date.now()}`, book, status, startedAt: status === "reading" ? new Date() : undefined };
    const newLib = [entry, ...library];
    setLibrary(newLib);
    setSelectedBook(null);
    save({ library: newLib.map((e) => ({ ...e, startedAt: e.startedAt?.toISOString(), finishedAt: e.finishedAt?.toISOString() })) });
  };

  const startReading = (entry: ReadingEntry) => {
    const newLib = library.map((e) => e.id === entry.id ? { ...e, status: "reading" as const, startedAt: new Date() } : e);
    setLibrary(newLib);
    save({ library: newLib.map((e) => ({ ...e, startedAt: e.startedAt?.toISOString(), finishedAt: e.finishedAt?.toISOString() })) });
  };

  // ── Post-reading ──────────────────────────────────────────────────
  const startFinish = async (entry: ReadingEntry) => {
    setFinEntry(entry);
    setPostStep(0);
    setPostAnswers({});
    setPostText("");
    setChildQuiz([]);
    setChildQuizAnswers([]);

    if (ageGroup === "child") {
      // Generate quiz via AI
      setLoadingQuiz(true);
      setShowFinish(true);
      try {
        const resp = await askClaude(
          `Genere 3 questions de comprehension QCM pour un enfant de 7-10 ans sur le livre "${entry.book.title}" de ${entry.book.author}. Format JSON: [{"q":"question","options":["choix1","choix2","choix3"]}]`,
          "Quiz lecture enfant"
        );
        const match = resp.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setChildQuiz(parsed);
        }
      } catch (e) {
        setChildQuiz([
          { q: "Qui est le personnage principal ?", options: ["Je ne sais plus", "Un enfant", "Un animal"] },
          { q: "L'histoire etait comment ?", options: ["Super !", "Bien", "Bof"] },
          { q: "Tu le relirais ?", options: ["Oui !", "Peut-etre", "Non"] },
        ]);
      } finally { setLoadingQuiz(false); }
    } else {
      setShowFinish(true);
    }
  };

  const postQuestions = finEntry ? getPostQuestions(ageGroup, finEntry.book.title) : [];
  const currentPost = postQuestions[postStep];

  const handlePostChoice = (label: string) => {
    if (!currentPost || !finEntry) return;
    const newA = { ...postAnswers, [currentPost.id]: label };
    setPostAnswers(newA);
    if (postStep < postQuestions.length - 1) setPostStep((s) => s + 1);
    else finishReading(newA);
  };

  const submitPostText = () => {
    if (!currentPost || !finEntry) return;
    const newA = { ...postAnswers, [currentPost.id]: postText };
    setPostText("");
    if (postStep < postQuestions.length - 1) { setPostAnswers(newA); setPostStep((s) => s + 1); }
    else finishReading(newA);
  };

  const handleChildQuizAnswer = (answer: string) => {
    const newAnswers = [...childQuizAnswers, answer];
    setChildQuizAnswers(newAnswers);
    if (newAnswers.length >= childQuiz.length) {
      // Save quiz to Firestore for parent
      if (familyId && userId) {
        addDoc(collection(db, "families", familyId, "readingQuiz"), {
          childId: userId,
          bookTitle: finEntry?.book.title,
          bookAuthor: finEntry?.book.author,
          quiz: childQuiz.map((q, i) => ({ question: q.q, answer: newAnswers[i] })),
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      }
      finishReading({});
    }
  };

  const finishReading = (answers: Record<string, string>) => {
    if (!finEntry) return;
    const newLib = library.map((e) =>
      e.id === finEntry.id ? { ...e, status: "finished" as const, finishedAt: new Date(), rating: "liked" as const } : e
    );
    setLibrary(newLib);
    save({
      library: newLib.map((e) => ({ ...e, startedAt: e.startedAt?.toISOString(), finishedAt: e.finishedAt?.toISOString() })),
      postReadingAnswers: { ...(preferences as any).postReadingAnswers, [finEntry.book.title]: answers },
    });
    setShowFinish(false);
    setFinEntry(null);
  };

  const openAmazon = (book: Book) => {
    Linking.openURL("https://www.amazon.fr/s?k=" + encodeURIComponent(book.title + " " + book.author));
  };

  const reading = library.filter((e) => e.status === "reading");
  const finished = library.filter((e) => e.status === "finished");
  const toRead = library.filter((e) => e.status === "to_read");

  // ── Render helpers ────────────────────────────────────────────────
  const OptionCard = ({ label, selected, onPress, showEmoji }: { label: string; selected?: boolean; onPress: () => void; showEmoji?: boolean }) => (
    <TouchableOpacity style={[S.opt, selected && S.optSel]} onPress={onPress} activeOpacity={0.8}>
      {showEmoji && ageGroup === "child" ? (
        <View style={S.optIcon}><Text style={{ fontSize: 20 }}>{label === "Oui j'adore" ? "😍" : label === "Bof" ? "😐" : label === "Pas trop" ? "😕" : "📖"}</Text></View>
      ) : null}
      <Text style={[S.optText, selected && S.optTextSel]}>{label}</Text>
      {selected ? <View style={S.optCheck}><Text style={S.optCheckText}>✓</Text></View> : null}
    </TouchableOpacity>
  );

  const BookCard = ({ book }: { book: Book }) => (
    <TouchableOpacity style={S.book} onPress={() => setSelectedBook(book)} activeOpacity={0.85}>
      {book.coverUrl ? <Image source={{ uri: book.coverUrl }} style={S.bookImg} /> : <View style={S.bookPlaceholder}><Text style={{ fontSize: 28 }}>📖</Text></View>}
      <View style={S.bookInfo}>
        <Text style={S.bookTitle}>{book.title}</Text>
        <Text style={S.bookAuthor}>{book.author}</Text>
        <Text style={S.bookDesc} numberOfLines={2}>{book.description}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6, alignItems: "center" }}>
          {book.ageRange ? <View style={S.badge}><Text style={S.badgeText}>{book.ageRange}</Text></View> : null}
          <TouchableOpacity style={S.buyBtn} onPress={() => openAmazon(book)}><Text style={S.buyText}>Se le procurer</Text></TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <View style={S.container}>
      {/* Hero */}
      <View style={S.hero}>
        <View style={S.c1} /><View style={S.c2} />
        <Text style={S.heroTitle}>Lecture</Text>
        <Text style={S.heroSub}>Decouvrir, lire et partager en famille</Text>
        <View style={S.pills}>
          {([["discover", "Decouvrir"], ["library", "Ma biblio"], ["family", "En famille"]] as [Tab, string][]).map(([k, l]) => (
            <TouchableOpacity key={k} style={[S.pill, activeTab === k && S.pillOn]} onPress={() => setActiveTab(k)}>
              <Text style={[S.pillT, activeTab === k && S.pillTOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ═══ DISCOVER - QUESTIONNAIRE ═══ */}
      {activeTab === "discover" && !profileComplete ? (
        <ScrollView style={S.scroll} contentContainerStyle={{ padding: 18, paddingBottom: 40, alignItems: "center" }}>
          <View style={S.dots}>
            {questions.map((_, i) => <View key={i} style={[S.dot, i <= step && S.dotOn]} />)}
          </View>
          <Text style={S.greeting}>
            {step === 0 ? (ageGroup === "child" ? "Dis-nous ce que tu aimes !" : ageGroup === "teen" ? "Apprenons a te connaitre" : "Apprenons a vous connaitre")
              : "Question " + (step + 1) + " sur " + questions.length}
          </Text>

          {currentQ ? (
            <View style={S.qCard}>
              <Text style={S.qText}>{currentQ.question}</Text>

              {currentQ.type === "choice" && currentQ.options?.map((o) => (
                <OptionCard key={o} label={o} onPress={() => selectChoice(o)} showEmoji={ageGroup === "child"} />
              ))}

              {currentQ.type === "multi" && currentQ.options ? (
                <View>
                  {currentQ.options.map((o) => (
                    <OptionCard key={o} label={o} selected={multiSel.includes(o)} onPress={() => selectChoice(o)} />
                  ))}
                  <TouchableOpacity style={[S.btn, multiSel.length === 0 && S.btnOff]} onPress={confirmMulti} disabled={multiSel.length === 0}>
                    <Text style={S.btnText}>Valider ({multiSel.length})</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {currentQ.type === "text" ? (
                <View>
                  <TextInput style={S.inp} placeholder="Tapez ici..." placeholderTextColor="#B0978A" value={textVal} onChangeText={setTextVal} multiline />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                    <TouchableOpacity onPress={() => { setTextVal(""); goNext(preferences); }} style={{ padding: 14 }}>
                      <Text style={{ color: "#B0978A", fontSize: 15 }}>Passer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[S.btn, { flex: 0, paddingHorizontal: 30 }, !textVal.trim() && S.btnOff]} onPress={confirmText} disabled={!textVal.trim()}>
                      <Text style={S.btnText}>Suivant</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity onPress={skip} style={{ marginTop: 20, padding: 12 }}>
            <Text style={{ color: "#B0978A", fontSize: 14, textDecorationLine: "underline" }}>Passer et voir les recommandations</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      {/* ═══ DISCOVER - BOOKS ═══ */}
      {activeTab === "discover" && profileComplete ? (
        <ScrollView style={S.scroll} contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
          {Object.keys(preferences).length > 0 ? (
            <View style={S.prefsCard}>
              <Text style={S.prefsTitle}>Votre profil lecture</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {Object.values(preferences).flat().filter(Boolean).map((t, i) => (
                  <View key={i} style={S.prefTag}><Text style={S.prefTagT}>{String(t)}</Text></View>
                ))}
              </View>
              <TouchableOpacity onPress={() => { setProfileComplete(false); setStep(0); setPreferences({}); }}>
                <Text style={{ color: "#B0978A", fontSize: 13, marginTop: 10, textDecorationLine: "underline" }}>Refaire le questionnaire</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={S.section}>RECOMMANDATIONS</Text>

          {loadingBooks ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🤖</Text>
              <Text style={{ fontSize: 16, color: "#2A7C6F", fontWeight: "800" }}>L'IA cherche des livres...</Text>
            </View>
          ) : null}

          {!loadingBooks && aiBooks.map((b) => <BookCard key={b.id} book={b} />)}

          <TouchableOpacity style={[S.btn, { marginTop: 16 }, loadingBooks && S.btnOff]} onPress={() => fetchRecos(preferences)} disabled={loadingBooks}>
            <Text style={S.btnText}>Nouvelles recommandations</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      {/* ═══ LIBRARY ═══ */}
      {activeTab === "library" ? (
        <ScrollView style={S.scroll} contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
          {reading.length > 0 ? <><Text style={S.section}>EN COURS</Text>{reading.map((e) => (
            <View key={e.id} style={S.book}>
              <View style={S.bookPlaceholder}><Text style={{ fontSize: 28 }}>📖</Text></View>
              <View style={S.bookInfo}>
                <Text style={S.bookTitle}>{e.book.title}</Text>
                <Text style={S.bookAuthor}>{e.book.author}</Text>
                <TouchableOpacity style={S.finBtn} onPress={() => startFinish(e)}><Text style={S.finBtnT}>J'ai termine !</Text></TouchableOpacity>
              </View>
            </View>
          ))}</> : null}
          {toRead.length > 0 ? <><Text style={S.section}>A LIRE</Text>{toRead.map((e) => (
            <View key={e.id} style={S.book}>
              <View style={S.bookPlaceholder}><Text style={{ fontSize: 28 }}>📚</Text></View>
              <View style={S.bookInfo}>
                <Text style={S.bookTitle}>{e.book.title}</Text>
                <Text style={S.bookAuthor}>{e.book.author}</Text>
                <TouchableOpacity style={S.startBtn} onPress={() => startReading(e)}><Text style={S.startBtnT}>Commencer</Text></TouchableOpacity>
              </View>
            </View>
          ))}</> : null}
          {finished.length > 0 ? <><Text style={S.section}>TERMINES ({finished.length})</Text>{finished.map((e) => (
            <View key={e.id} style={S.book}>
              <View style={S.bookPlaceholder}><Text style={{ fontSize: 28 }}>✅</Text></View>
              <View style={S.bookInfo}>
                <Text style={S.bookTitle}>{e.book.title}</Text>
                <Text style={S.bookAuthor}>{e.book.author}</Text>
              </View>
            </View>
          ))}</> : null}
          {library.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Text style={{ fontSize: 60, marginBottom: 16 }}>📚</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#7A6055", marginBottom: 8 }}>Bibliotheque vide</Text>
              <Text style={{ fontSize: 14, color: "#B0978A", textAlign: "center" }}>Allez dans Decouvrir pour ajouter des livres</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      {/* ═══ FAMILY ═══ */}
      {activeTab === "family" ? (
        <ScrollView style={S.scroll} contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
          <Text style={S.section}>EN CE MOMENT DANS LA FAMILLE</Text>
          {reading.length > 0 ? reading.map((e) => (
            <View key={e.id} style={S.famCard}>
              <Text style={S.famTitle}>{e.book.title}</Text>
              <Text style={S.famAuthor}>{e.book.author}</Text>
            </View>
          )) : (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Text style={{ fontSize: 60, marginBottom: 16 }}>👨‍👩‍👧‍👦</Text>
              <Text style={{ fontSize: 14, color: "#B0978A", textAlign: "center", lineHeight: 22 }}>Quand les membres liront, vous verrez ici ce que chacun lit.</Text>
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* ═══ BOOK DETAIL MODAL ═══ */}
      <Modal visible={!!selectedBook} animationType="slide" transparent>
        <View style={S.modalBg}>
          <View style={S.modal}>
            {selectedBook ? <>
              {selectedBook.coverUrl ? <Image source={{ uri: selectedBook.coverUrl }} style={{ width: 120, height: 180, borderRadius: 12, marginBottom: 16 }} /> : <Text style={{ fontSize: 48, marginBottom: 12 }}>📖</Text>}
              <Text style={S.modalTitle}>{selectedBook.title}</Text>
              <Text style={{ fontSize: 16, color: "#B0978A", marginBottom: 12 }}>{selectedBook.author}</Text>
              <Text style={{ fontSize: 14, color: "#7A6055", textAlign: "center", lineHeight: 22, marginBottom: 12 }}>{selectedBook.description}</Text>
              {selectedBook.genre ? <Text style={{ fontSize: 13, color: "#B0978A", marginBottom: 16 }}>Genre : {selectedBook.genre}</Text> : null}
              <TouchableOpacity style={S.btn} onPress={() => addToLib(selectedBook, "reading")}><Text style={S.btnText}>Je le lis !</Text></TouchableOpacity>
              <TouchableOpacity style={S.btnOut} onPress={() => addToLib(selectedBook, "to_read")}><Text style={S.btnOutText}>A lire plus tard</Text></TouchableOpacity>
              <TouchableOpacity style={[S.btn, { backgroundColor: "#C9933A" }]} onPress={() => openAmazon(selectedBook)}><Text style={S.btnText}>Se le procurer</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedBook(null)} style={{ padding: 14 }}><Text style={{ color: "#B0978A" }}>Fermer</Text></TouchableOpacity>
            </> : null}
          </View>
        </View>
      </Modal>

      {/* ═══ POST-READING MODAL ═══ */}
      <Modal visible={showFinish} animationType="slide" transparent>
        <View style={S.modalBg}>
          <View style={S.modal}>
            {finEntry ? <>
              <Text style={{ fontSize: 48, marginBottom: 8 }}>🎉</Text>
              <Text style={S.modalTitle}>Bravo !</Text>
              <Text style={{ fontSize: 14, color: "#7A6055", marginBottom: 16, textAlign: "center" }}>
                {ageGroup === "child" ? `Super, tu as fini "${finEntry.book.title}" !` : `Vous avez termine "${finEntry.book.title}"`}
              </Text>

              {/* Child quiz */}
              {ageGroup === "child" ? (
                loadingQuiz ? (
                  <Text style={{ color: "#2A7C6F", fontWeight: "800" }}>L'IA prepare un mini quiz...</Text>
                ) : childQuiz.length > 0 && childQuizAnswers.length < childQuiz.length ? (
                  <View style={{ width: "100%" }}>
                    <Text style={S.qText}>{childQuiz[childQuizAnswers.length].q}</Text>
                    {childQuiz[childQuizAnswers.length].options.map((o) => (
                      <OptionCard key={o} label={o} onPress={() => handleChildQuizAnswer(o)} showEmoji />
                    ))}
                  </View>
                ) : null
              ) : null}

              {/* Teen/Adult post questions */}
              {ageGroup !== "child" && currentPost ? (
                <View style={{ width: "100%" }}>
                  <View style={[S.dots, { marginBottom: 12 }]}>
                    {postQuestions.map((_, i) => <View key={i} style={[S.dot, i <= postStep && S.dotOn]} />)}
                  </View>
                  <Text style={[S.qText, { marginBottom: 12 }]}>{currentPost.question}</Text>
                  {currentPost.type === "choice" && currentPost.options?.map((o) => (
                    <OptionCard key={o} label={o} onPress={() => handlePostChoice(o)} />
                  ))}
                  {currentPost.type === "text" ? (
                    <View>
                      <TextInput style={S.inp} placeholder="Votre reponse..." placeholderTextColor="#B0978A" value={postText} onChangeText={setPostText} multiline />
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                        <TouchableOpacity onPress={() => { setPostText(""); if (postStep < postQuestions.length - 1) setPostStep((s) => s + 1); else finishReading(postAnswers); }} style={{ padding: 14 }}>
                          <Text style={{ color: "#B0978A" }}>Passer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[S.btn, { flex: 0, paddingHorizontal: 30 }]} onPress={submitPostText}>
                          <Text style={S.btnText}>Valider</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <TouchableOpacity onPress={() => { setShowFinish(false); setFinEntry(null); }} style={{ padding: 14, marginTop: 8 }}>
                <Text style={{ color: "#B0978A" }}>Annuler</Text>
              </TouchableOpacity>
            </> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF7F2" },
  scroll: { flex: 1 },

  // Hero
  hero: { backgroundColor: "#2A7C6F", paddingTop: Platform.OS === "ios" ? 14 : 10, paddingBottom: 18, paddingHorizontal: 22, position: "relative", overflow: "hidden" },
  c1: { position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.06)" },
  c2: { position: "absolute", bottom: -20, left: -10, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.04)" },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#fff", fontStyle: "italic", marginBottom: 4 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 14 },

  pills: { flexDirection: "row", gap: 8 },
  pill: { backgroundColor: "rgba(255,255,255,0.15)", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  pillOn: { backgroundColor: "rgba(255,255,255,0.95)", borderColor: "transparent" },
  pillT: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  pillTOn: { color: "#2A7C6F" },

  // Progress
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EDE3D5", marginHorizontal: 4 },
  dotOn: { backgroundColor: "#2A7C6F", width: 24 },

  greeting: { fontSize: 16, fontWeight: "800", color: "#2A7C6F", textAlign: "center", marginBottom: 16 },

  // Question card
  qCard: { backgroundColor: "#fff", borderRadius: 24, padding: 22, width: "100%", borderWidth: 1, borderColor: "rgba(107,78,61,0.1)", shadowColor: "rgba(44,31,20,0.08)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 20, elevation: 3 },
  qText: { fontSize: 18, fontWeight: "800", color: "#2C1F14", textAlign: "center", marginBottom: 16 },

  // Options
  opt: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 20, marginBottom: 10, borderWidth: 2, borderColor: "rgba(107,78,61,0.08)", shadowColor: "rgba(44,31,20,0.06)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 },
  optSel: { borderColor: "#2A7C6F", backgroundColor: "#D0EDE9" },
  optIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#F5EFE6", alignItems: "center", justifyContent: "center", marginRight: 12 },
  optText: { fontSize: 16, fontWeight: "700", color: "#2C1F14", flex: 1 },
  optTextSel: { color: "#2A7C6F", fontWeight: "800" },
  optCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#2A7C6F", alignItems: "center", justifyContent: "center" },
  optCheckText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  // Buttons
  btn: { backgroundColor: "#2A7C6F", paddingVertical: 16, borderRadius: 18, alignItems: "center", width: "100%", marginTop: 10, shadowColor: "rgba(42,124,111,0.35)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 20, elevation: 6 },
  btnOff: { opacity: 0.4 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  btnOut: { borderWidth: 2, borderColor: "rgba(107,78,61,0.1)", paddingVertical: 14, borderRadius: 18, width: "100%", alignItems: "center", marginTop: 8, backgroundColor: "#fff" },
  btnOutText: { color: "#7A6055", fontSize: 16, fontWeight: "700" },

  inp: { backgroundColor: "#F5EFE6", padding: 14, borderRadius: 16, fontSize: 16, minHeight: 70, textAlignVertical: "top" },

  // Section
  section: { fontSize: 11, fontWeight: "800", color: "#B0978A", letterSpacing: 0.8, marginBottom: 12 },

  // Prefs
  prefsCard: { backgroundColor: "#D0EDE9", borderRadius: 20, padding: 18, marginBottom: 20 },
  prefsTitle: { fontSize: 15, fontWeight: "800", color: "#2A7C6F", marginBottom: 10 },
  prefTag: { backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, margin: 3 },
  prefTagT: { fontSize: 13, color: "#2A7C6F", fontWeight: "600" },

  // Book
  book: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 24, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(107,78,61,0.1)", shadowColor: "rgba(44,31,20,0.08)", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 20, elevation: 2 },
  bookImg: { width: 70, height: 100, borderRadius: 12, marginRight: 14 },
  bookPlaceholder: { width: 70, height: 100, backgroundColor: "#F5EFE6", borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  bookInfo: { flex: 1, justifyContent: "center" },
  bookTitle: { fontSize: 16, fontWeight: "800", color: "#2C1F14", marginBottom: 2 },
  bookAuthor: { fontSize: 14, color: "#2A7C6F", marginBottom: 4 },
  bookDesc: { fontSize: 13, color: "#7A6055", lineHeight: 18 },
  badge: { backgroundColor: "#D0EDE9", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, color: "#2A7C6F", fontWeight: "700" },
  buyBtn: { backgroundColor: "#C9933A", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  buyText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  finBtn: { backgroundColor: "#2A7C6F", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, alignSelf: "flex-start", marginTop: 8 },
  finBtnT: { color: "#fff", fontSize: 13, fontWeight: "700" },
  startBtn: { backgroundColor: "#D0EDE9", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, alignSelf: "flex-start", marginTop: 8 },
  startBtnT: { color: "#2A7C6F", fontSize: 13, fontWeight: "700" },

  // Family
  famCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: "#2A7C6F" },
  famTitle: { fontSize: 15, fontWeight: "700", color: "#2C1F14" },
  famAuthor: { fontSize: 13, color: "#B0978A", marginTop: 2 },

  // Modal
  modalBg: { flex: 1, backgroundColor: "rgba(44,31,20,0.6)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#FBF7F2", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 26, alignItems: "center", maxHeight: "85%" },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#2C1F14", marginBottom: 4 },
});
