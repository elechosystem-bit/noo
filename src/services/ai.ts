const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

export async function askClaude(
  message: string,
  familyContext: string
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;

  if (!apiKey) {
    throw new Error("Claude API key not configured");
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `Tu es Noo, l'assistant IA familial bienveillant du réseau social familial "Noo".
Tu aides les membres de la famille avec des conseils, des idées d'activités,
des recettes, de l'aide aux devoirs, et tu encourages les liens familiaux.
Sois chaleureux, positif et adapte-toi à l'âge de l'interlocuteur.
Contexte familial: ${familyContext}`,
      messages: [{ role: "user", content: message }],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Erreur API Claude");
  }

  return data.content[0].text;
}
