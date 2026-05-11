import OpenAI from "openai";

/** Server-side only — never import from client bundles. */
export function getOpenAi(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return null;
  }
  return new OpenAI({ apiKey: key });
}

export function getAiCompletionModel(): string {
  const m = process.env.OPENAI_AI_MODEL?.trim();
  return m && m.length > 0 ? m : "gpt-4o-mini";
}
