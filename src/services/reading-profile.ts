// Profil de lecture — questions de découverte et moteur de préférences

export interface ReadingPreference {
  tag: string;
  weight: number; // 1 = léger, 2 = moyen, 3 = fort
}

export interface ReadingProfile {
  completed: boolean;
  preferences: ReadingPreference[];
  mood?: string;
  lastBookLoved?: string;
  answers: Record<string, string>;
}

export interface DiscoveryQuestion {
  id: string;
  question: string;
  subtitle?: string;
  type: "choice" | "multi" | "text";
  options?: { label: string; emoji: string; tags: string[] }[];
  forAge?: { min?: number; max?: number };
}

// Questions de découverte — conversation naturelle, pas un formulaire
export const discoveryQuestions: DiscoveryQuestion[] = [
  {
    id: "mood",
    question: "En ce moment, tu as plutôt envie de...",
    subtitle: "Il n'y a pas de mauvaise réponse !",
    type: "choice",
    options: [
      { label: "Rire et m'amuser", emoji: "😂", tags: ["humour", "aventure"] },
      { label: "Voyager loin d'ici", emoji: "🌍", tags: ["voyage", "aventure", "fantasy"] },
      { label: "Frissonner un peu", emoji: "😱", tags: ["suspense", "mystère", "fantastique"] },
      { label: "Apprendre des choses", emoji: "🧠", tags: ["science", "documentaire", "histoire"] },
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
      { label: "Histoires vraies", emoji: "📰", tags: ["biographie", "histoire-vraie"] },
      { label: "Magie & fantastique", emoji: "🧙", tags: ["fantasy", "fantastique", "magie"] },
      { label: "Animaux & nature", emoji: "🐾", tags: ["animaux", "nature"] },
      { label: "Science & espace", emoji: "🚀", tags: ["science", "sf", "espace"] },
      { label: "Amour & amitié", emoji: "💕", tags: ["romance", "amitié", "émotion"] },
      { label: "Enquêtes & mystères", emoji: "🔍", tags: ["policier", "mystère", "enquête"] },
      { label: "BD & manga", emoji: "💬", tags: ["bd", "manga", "graphique"] },
    ],
  },
  {
    id: "length",
    question: "Tu préfères les livres plutôt...",
    type: "choice",
    options: [
      { label: "Courts — vite lus !", emoji: "📄", tags: ["court"] },
      { label: "Moyens — le bon format", emoji: "📕", tags: ["moyen"] },
      { label: "Longs — j'adore m'y plonger", emoji: "📚", tags: ["long", "saga"] },
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

// Questions post-lecture — pour affiner après chaque livre
export interface PostReadingQuestion {
  id: string;
  question: string;
  type: "choice" | "text";
  options?: { label: string; emoji: string; tags: string[] }[];
}

export function getPostReadingFlow(bookTitle: string): PostReadingQuestion[] {
  return [
    {
      id: "feeling",
      question: `Qu'est-ce que "${bookTitle}" t'a fait ressentir ?`,
      type: "choice",
      options: [
        { label: "De la joie", emoji: "😊", tags: ["aime-humour", "aime-positif"] },
        { label: "De l'émotion", emoji: "🥹", tags: ["aime-émotion"] },
        { label: "De l'excitation", emoji: "🤩", tags: ["aime-aventure", "aime-action"] },
        { label: "De la curiosité", emoji: "🤔", tags: ["aime-réflexion", "aime-mystère"] },
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

// Extraire les tags depuis les réponses de découverte
export function buildPreferencesFromAnswers(
  answers: Record<string, string | string[]>
): ReadingPreference[] {
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

  return Object.entries(tagCounts).map(([tag, count]) => ({
    tag,
    weight: Math.min(count, 3) as 1 | 2 | 3,
  }));
}

// Recommandations basées sur le profil
export function getSmartRecommendations(
  preferences: ReadingPreference[],
  allBooks: { id: string; title: string; author: string; description: string; genre?: string; ageRange?: string; tags?: string[] }[]
) {
  if (preferences.length === 0) return allBooks.slice(0, 3);

  const prefTags = new Set(preferences.map((p) => p.tag));

  const scored = allBooks.map((book) => {
    let score = 0;
    const bookTags = book.tags || [];
    for (const tag of bookTags) {
      if (prefTags.has(tag)) {
        const pref = preferences.find((p) => p.tag === tag);
        score += pref?.weight || 1;
      }
    }
    return { book, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.book).slice(0, 3);
}
