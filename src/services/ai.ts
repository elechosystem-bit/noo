// Mode démo : réponses prédéfinies (passer à true quand l'API Claude est configurée)
const USE_CLOUD_FUNCTION = false;

import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../config/firebase";

const demoResponses: Record<string, string> = {
  recette: "Voici une idée de recette familiale : des crêpes maison ! 🥞\n\nIngrédients : 250g de farine, 4 œufs, 50cl de lait, 1 pincée de sel, 2 cuillères de sucre.\n\nMélangez tout, laissez reposer 1h et c'est parti ! Les enfants adorent garnir leurs propres crêpes.",
  activité: "Que diriez-vous d'une soirée jeux de société en famille ? 🎲\n\nQuelques idées :\n- Uno (pour tous les âges)\n- Dobble (rapide et fun)\n- Dixit (créatif et poétique)\n\nLe plus important c'est de passer du temps ensemble !",
  devoir: "Je suis là pour aider avec les devoirs ! 📚\n\nN'hésitez pas à me poser une question précise sur un exercice de maths, français, sciences... Je ferai de mon mieux pour expliquer de façon claire et adaptée.",
  bonjour: "Bonjour ! 👋 Je suis Noo, votre assistant familial.\n\nJe peux vous aider avec :\n- 🍳 Des idées de recettes\n- 🎮 Des activités en famille\n- 📖 De l'aide aux devoirs\n- 💡 Des conseils du quotidien\n\nQue puis-je faire pour vous ?",
};

function getDemoResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("recette") || lower.includes("cuisine") || lower.includes("manger")) {
    return demoResponses.recette;
  }
  if (lower.includes("activité") || lower.includes("jeu") || lower.includes("faire")) {
    return demoResponses.activité;
  }
  if (lower.includes("devoir") || lower.includes("exercice") || lower.includes("math")) {
    return demoResponses.devoir;
  }
  if (lower.includes("bonjour") || lower.includes("salut") || lower.includes("hello")) {
    return demoResponses.bonjour;
  }

  return "Merci pour votre message ! 😊\n\nJe suis Noo en mode démo pour le moment. Essayez de me demander une recette, une activité en famille, ou de l'aide pour les devoirs !\n\nBientôt, je serai connecté à une vraie IA pour des réponses encore plus personnalisées.";
}

export async function askClaude(
  message: string,
  familyContext: string
): Promise<string> {
  if (!USE_CLOUD_FUNCTION) {
    // Simule un petit délai pour un effet naturel
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return getDemoResponse(message);
  }

  const functions = getFunctions(app, "europe-west1");
  const askNooFunction = httpsCallable(functions, "askNoo");
  const result = await askNooFunction({ message, familyContext });
  const data = result.data as { text: string };
  return data.text;
}
