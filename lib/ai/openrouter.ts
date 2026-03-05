import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";

const DEFAULT_MODEL =
  process.env.LLM_MODEL || "openai/gpt-4o-mini";
const BASE_URL =
  process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1/chat/completions";

export async function createChatCompletion(options: {
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "missing OPENROUTER_API_KEY. set it in .env.local to use the free model.",
    );
  }

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "FoggyBot",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: options.messages,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 350,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`openrouter error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return json;
}

