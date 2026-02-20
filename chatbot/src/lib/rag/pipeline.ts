import { openai } from "@/lib/openai/client";
import { embedText } from "@/lib/openai/embeddings";
import {
  searchChunks,
  hybridSearch,
  listDocumentSummaries,
} from "@/lib/supabase/queries";
import {
  TOOLS,
  type SearchDocumentsArgs,
  type ListDocumentsArgs,
} from "@/lib/openai/tools";
import { buildAgenticSystemMessage } from "./system-prompt";
import { assembleContext } from "./context-assembler";
import type { Source } from "@/types/chat";
import { SearchError } from "@/lib/utils/errors";
import {
  CHAT_MODEL,
  CHAT_TEMPERATURE,
  MAX_TOOL_ITERATIONS,
} from "@/lib/utils/constants";
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";

export interface ToolCallEvent {
  toolName: string;
  args: Record<string, unknown>;
}

export interface RagResult {
  sources: Source[];
  stream: AsyncGenerator<string>;
  toolCalls: ToolCallEvent[];
}

/**
 * Build a human-readable description of which filters were applied.
 * Used for informative "no results" messages (Bug 4 fix).
 */
function buildAppliedFiltersDescription(args: SearchDocumentsArgs): string {
  const parts: string[] = [];
  if (args.query) parts.push(`query="${args.query}"`);
  if (args.document_type) parts.push(`type=${args.document_type}`);
  if (args.jurisdiction) parts.push(`jurisdiction=${args.jurisdiction}`);
  if (args.date_from) parts.push(`from=${args.date_from}`);
  if (args.date_to) parts.push(`to=${args.date_to}`);
  if (args.party) parts.push(`party=${args.party}`);
  if (args.author) parts.push(`author=${args.author}`);
  if (args.contract_form) parts.push(`form=${args.contract_form}`);
  if (args.witness) parts.push(`witness=${args.witness}`);
  return parts.join(", ");
}

/**
 * Execute a single tool call and return the result text + any sources found.
 */
async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ result: string; sources: Source[] }> {
  switch (toolName) {
    case "search_documents": {
      const a = args as unknown as SearchDocumentsArgs;
      const count = Math.min(a.max_results ?? 15, 30);

      let results: Source[];

      const filterOpts = {
        documentType: a.document_type,
        jurisdiction: a.jurisdiction,
        dateFrom: a.date_from,
        dateTo: a.date_to,
        party: a.party,
        author: a.author,
        contractForm: a.contract_form,
        witness: a.witness,
        count,
      };

      if (a.query && a.query.trim().length > 0) {
        // Hybrid search: vector similarity + full-text keyword matching
        // combined via Reciprocal Rank Fusion (RRF)
        const queryEmbedding = await embedText(a.query);
        results = await hybridSearch(a.query, queryEmbedding, filterOpts);
      } else {
        // Fallback: GPT sent filters only without a semantic query.
        // Use a generic embedding so vector search still works,
        // but set threshold to 0 so filters dominate.
        const fallbackEmbedding = await embedText("legal document");
        results = await searchChunks(fallbackEmbedding, {
          ...filterOpts,
          threshold: 0.0,
        });
      }

      if (results.length === 0) {
        const appliedFilters = buildAppliedFiltersDescription(a);
        return {
          result: appliedFilters
            ? `No documents matched the search criteria. Filters applied: ${appliedFilters}. Try broadening your search by removing some filters.`
            : "No documents matched the search criteria.",
          sources: [],
        };
      }

      const { contextText, usedSources } = assembleContext(results);
      return { result: contextText, sources: usedSources };
    }

    case "list_documents": {
      const a = args as unknown as ListDocumentsArgs;
      const docs = await listDocumentSummaries();
      const filtered = a.document_type
        ? docs.filter((d) => d.documentType === a.document_type)
        : docs;

      if (filtered.length === 0) {
        return { result: "No documents are currently uploaded.", sources: [] };
      }

      const summary = filtered
        .map(
          (d, i) =>
            `${i + 1}. ${d.title || d.filename}` +
            (d.documentType ? ` [${d.documentType}]` : "") +
            (d.jurisdiction ? ` | ${d.jurisdiction}` : "") +
            (d.parties ? ` | Parties: ${d.parties.join(", ")}` : "") +
            (d.dateFiled ? ` | Filed: ${d.dateFiled}` : "") +
            (d.caseNumber ? ` | Case: ${d.caseNumber}` : "") +
            (d.author ? ` | Author: ${d.author}` : "") +
            (d.contractForm ? ` | Form: ${d.contractForm}` : "") +
            (d.witnesses ? ` | Witnesses: ${d.witnesses.join(", ")}` : "") +
            (d.dollarAmounts
              ? ` | Amounts: ${d.dollarAmounts.join("; ")}`
              : "") +
            ` | ${d.chunkCount} chunks`
        )
        .join("\n");

      return {
        result:
          `Available documents (${filtered.length}):\n${summary}\n\n` +
          `NOTE: This list contains metadata only, not document content. ` +
          `To summarize, compare, or analyze document content, you MUST call ` +
          `search_documents with a relevant query for each document of interest.`,
        sources: [],
      };
    }

    default:
      return { result: `Unknown tool: ${toolName}`, sources: [] };
  }
}

/**
 * Agentic RAG pipeline:
 * 1. Send user message + tool definitions to GPT (non-streaming)
 * 2. If GPT returns tool calls, execute them and loop back
 * 3. When GPT produces a text response, yield it as a stream
 */
export async function executeRagPipeline(
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): Promise<RagResult> {
  const lastUserMessage = [...conversationHistory]
    .reverse()
    .find((m) => m.role === "user");

  if (!lastUserMessage) {
    throw new SearchError("No user message found in conversation history");
  }

  // Build the initial messages array (no pre-injected context — tools handle retrieval)
  const systemMessage = buildAgenticSystemMessage();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemMessage },
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const allSources: Source[] = [];
  const allToolCalls: ToolCallEvent[] = [];

  // Agentic loop: GPT decides whether to call tools or respond directly
  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: CHAT_TEMPERATURE,
      messages,
      tools: TOOLS,
    });

    const choice = response.choices[0];

    // If GPT wants to call tools
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type !== "function") continue;

        const args = JSON.parse(toolCall.function.arguments);
        allToolCalls.push({ toolName: toolCall.function.name, args });

        const { result, sources } = await executeTool(
          toolCall.function.name,
          args
        );
        allSources.push(...sources);

        const toolMessage: ChatCompletionToolMessageParam = {
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        };
        messages.push(toolMessage);
      }

      // Loop back — GPT will see the tool results and may call more tools or respond
      continue;
    }

    // GPT produced a text response (no tool calls). Yield it as a stream.
    if (choice.message.content) {
      const content = choice.message.content;

      async function* yieldContent(): AsyncGenerator<string> {
        // Yield in chunks to maintain streaming UX
        const chunkSize = 20;
        for (let i = 0; i < content.length; i += chunkSize) {
          yield content.slice(i, i + chunkSize);
        }
      }

      return {
        sources: deduplicateSources(allSources),
        stream: yieldContent(),
        toolCalls: allToolCalls,
      };
    }

    // No content and no tool calls — break
    break;
  }

  // If we exhausted iterations, force a final response without tools
  const finalStream = streamFinalResponse(messages);

  return {
    sources: deduplicateSources(allSources),
    stream: finalStream,
    toolCalls: allToolCalls,
  };
}

/**
 * Force a final streaming response by calling without tools.
 */
async function* streamFinalResponse(
  messages: ChatCompletionMessageParam[]
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

/**
 * Deduplicate sources by chunkId.
 */
function deduplicateSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.chunkId)) return false;
    seen.add(s.chunkId);
    return true;
  });
}
