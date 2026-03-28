import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../config/firebase";

const functions = getFunctions(app, "europe-west1");
const askNooFunction = httpsCallable(functions, "askNoo");

export async function askClaude(
  message: string,
  familyContext: string
): Promise<string> {
  const result = await askNooFunction({ message, familyContext });
  const data = result.data as { text: string };
  return data.text;
}
