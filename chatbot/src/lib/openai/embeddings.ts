import { openai } from "./client";
import { EMBEDDING_MODEL, EMBEDDING_BATCH_SIZE } from "@/lib/utils/constants";
import { EmbeddingError } from "@/lib/utils/errors";

/**
 * Generate an embedding for a single text string.
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    throw new EmbeddingError(
      `Failed to embed text: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate embeddings for multiple texts in batches.
 * OpenAI accepts up to 2048 inputs per call; we batch at EMBEDDING_BATCH_SIZE for safety.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
      });

      // Sort by index to maintain order
      const sorted = response.data.sort((a, b) => a.index - b.index);
      allEmbeddings.push(...sorted.map((item) => item.embedding));
    } catch (error) {
      throw new EmbeddingError(
        `Failed to embed batch starting at index ${i}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return allEmbeddings;
}
