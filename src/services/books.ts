import { askClaude } from "./ai";

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  description: string;
  ageRange?: string;
  genre?: string;
  isbn?: string;
}

export interface ReadingEntry {
  id: string;
  book: Book;
  status: "reading" | "finished" | "to_read";
  rating?: "loved" | "liked" | "not_for_me";
  startedAt?: Date;
  finishedAt?: Date;
  notes?: string;
}

// Recommandations en mode démo (avant connexion API Google Books)
const demoBooks: Book[] = [
  {
    id: "demo_1",
    title: "Le Petit Prince",
    author: "Antoine de Saint-Exupéry",
    description: "Un pilote échoué dans le désert rencontre un petit prince venu d'une autre planète. Un conte poétique sur l'amitié, l'amour et l'essentiel invisible.",
    ageRange: "7-99",
    genre: "Conte",
  },
  {
    id: "demo_2",
    title: "Harry Potter à l'école des sorciers",
    author: "J.K. Rowling",
    description: "Harry découvre qu'il est un sorcier et entre à Poudlard. Le début d'une aventure magique qui a conquis des millions de familles.",
    ageRange: "9-14",
    genre: "Fantasy",
  },
  {
    id: "demo_3",
    title: "Matilda",
    author: "Roald Dahl",
    description: "Matilda est une petite fille extraordinairement intelligente avec des parents qui s'en fichent. Heureusement, il y a Mademoiselle Candy...",
    ageRange: "7-12",
    genre: "Jeunesse",
  },
  {
    id: "demo_4",
    title: "L'Étranger",
    author: "Albert Camus",
    description: "Meursault, un homme indifférent, raconte les événements qui vont le mener au drame. Un classique qui interroge notre rapport au monde.",
    ageRange: "15+",
    genre: "Classique",
  },
  {
    id: "demo_5",
    title: "La Vie devant soi",
    author: "Romain Gary",
    description: "Momo, un petit garçon arabe, raconte sa vie avec Madame Rosa, une vieille dame juive. Un chef-d'œuvre sur l'amour et la tendresse.",
    ageRange: "14+",
    genre: "Roman",
  },
  {
    id: "demo_6",
    title: "Les Malheurs de Sophie",
    author: "Comtesse de Ségur",
    description: "Les bêtises et aventures de la petite Sophie, une enfant espiègle et attachante. Un grand classique de la littérature jeunesse française.",
    ageRange: "6-10",
    genre: "Jeunesse classique",
  },
];

export function getRecommendations(memberAge?: number): Book[] {
  if (!memberAge) return demoBooks.slice(0, 3);

  return demoBooks
    .filter((book) => {
      if (!book.ageRange) return true;
      const match = book.ageRange.match(/(\d+)/);
      if (!match) return true;
      const minAge = parseInt(match[1]);
      return memberAge >= minAge;
    })
    .slice(0, 3);
}

export async function getAIBookRecommendation(
  memberName: string,
  memberAge: number,
  booksRead: string[],
  preferences: string[]
): Promise<string> {
  const prompt = `Recommande 3 livres pour ${memberName} (${memberAge} ans).
Livres déjà lus : ${booksRead.length > 0 ? booksRead.join(", ") : "aucun encore"}.
Centres d'intérêt : ${preferences.length > 0 ? preferences.join(", ") : "à découvrir"}.
Pour chaque livre donne : titre, auteur, et une phrase qui donne envie de le lire.`;

  return askClaude(prompt, `Membre famille: ${memberName}, ${memberAge} ans`);
}

export async function getPostReadingQuestions(
  bookTitle: string,
  bookAuthor: string,
  memberAge: number
): Promise<string> {
  const prompt = `${bookTitle} de ${bookAuthor} vient d'être lu par un membre de ${memberAge} ans. Pose 2-3 questions douces et ouvertes pour en parler ensemble, adaptées à l'âge.`;

  return askClaude(prompt, `Discussion après lecture`);
}
