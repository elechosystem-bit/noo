const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const Anthropic = require("@anthropic-ai/sdk");

const claudeApiKey = defineSecret("CLAUDE_API_KEY");

exports.askNoo = onCall(
  { secrets: [claudeApiKey], region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez être connecté.");
    }

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
      throw new HttpsError("internal", "Erreur lors de la communication avec l'IA.");
    }
  }
);
