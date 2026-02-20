import { openai } from "./client";
import { CHAT_MODEL, CHAT_TEMPERATURE } from "@/lib/utils/constants";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Create a streaming chat completion from OpenAI.
 * Returns an async iterable of content deltas.
 */
export async function* streamChatCompletion(
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: CHAT_TEMPERATURE,
    stream: true,
    messages,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
