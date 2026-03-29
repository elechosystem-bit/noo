const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const Anthropic = require("@anthropic-ai/sdk");

const claudeApiKey = defineSecret("CLAUDE_API_KEY");

// Chat IA general
exports.askNoo = onCall(
  {
    secrets: [claudeApiKey],
    region: "europe-west1",
    invoker: "public",
    cors: true,
  },
  async (request) => {
    const { message, familyContext } = request.data;

    if (!message || typeof message !== "string") {
      throw new HttpsError("invalid-argument", "Le message est requis.");
    }

    const client = new Anthropic({ apiKey: claudeApiKey.value() });

    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `Tu es Noo, l'assistant IA familial bienveillant du réseau social familial "Noo".
Tu aides les membres de la famille avec des conseils, des idées d'activités,
des recettes, de l'aide aux devoirs, et tu encourages les liens familiaux.
Sois chaleureux, positif et adapte-toi à l'âge de l'interlocuteur.
Contexte familial: ${familyContext || "Famille utilisant l'app Noo"}`,
        messages: [{ role: "user", content: message }],
      });

      return { text: response.content[0].text };
    } catch (error) {
      console.error("Claude API error:", error);
      throw new HttpsError("internal", "Erreur lors de la communication avec l'IA.");
    }
  }
);

// Recommandations de livres avec couvertures
exports.getBookRecommendations = onCall(
  {
    secrets: [claudeApiKey],
    region: "europe-west1",
    invoker: "public",
    cors: true,
    timeoutSeconds: 60,
  },
  async (request) => {
    const { preferences, booksRead } = request.data;

    const prefText = preferences && preferences.length > 0
      ? preferences.join(", ")
      : "";

    const readText = booksRead && booksRead.length > 0
      ? booksRead.join(", ")
      : "";

    const client = new Anthropic({ apiKey: claudeApiKey.value() });

    try {
      const prompt = `Tu es un libraire passionné. Recommande exactement 5 livres${prefText ? " pour quelqu'un qui aime : " + prefText : " variés pour une famille"}.
${readText ? "Cette personne a déjà lu : " + readText + ". Ne recommande PAS ces livres." : ""}

IMPORTANT : Sois original et surprenant ! Ne recommande PAS les classiques évidents (pas de Petit Prince, Harry Potter, Matilda, etc. sauf si ça correspond vraiment aux goûts). Pioche dans toute la littérature française et internationale, des pépites méconnues, des nouveautés, des coups de coeur de libraire.

Réponds UNIQUEMENT dans ce format JSON, rien d'autre :
[
  {"title": "Titre du livre", "author": "Auteur", "description": "Une phrase enthousiasmante qui donne envie", "age": "tranche d'âge", "genre": "genre"},
  ...
]`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].text;

      // Parse JSON from response
      let books = [];
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          books = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("JSON parse error:", e);
        throw new HttpsError("internal", "Erreur de parsing des recommandations.");
      }

      // Fetch covers from Open Library (100% free, no API key)
      const booksWithCovers = await Promise.all(
        books.map(async (book) => {
          try {
            // Search Open Library for the book
            const query = encodeURIComponent(book.title + " " + book.author);
            const res = await fetch(
              "https://openlibrary.org/search.json?q=" + query + "&limit=1&fields=key,cover_i,isbn"
            );
            const data = await res.json();
            let coverUrl = null;
            if (data.docs && data.docs.length > 0) {
              const doc = data.docs[0];
              if (doc.cover_i) {
                coverUrl = "https://covers.openlibrary.org/b/id/" + doc.cover_i + "-M.jpg";
              } else if (doc.isbn && doc.isbn.length > 0) {
                coverUrl = "https://covers.openlibrary.org/b/isbn/" + doc.isbn[0] + "-M.jpg";
              }
            }
            return { ...book, coverUrl };
          } catch (e) {
            return { ...book, coverUrl: null };
          }
        })
      );

      return { books: booksWithCovers };
    } catch (error) {
      console.error("Book recommendation error:", error);
      throw new HttpsError("internal", "Erreur lors de la recommandation de livres.");
    }
  }
);
