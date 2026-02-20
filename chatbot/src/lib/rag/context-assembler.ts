import type { Source } from "@/types/chat";
import { MAX_CONTEXT_TOKENS } from "@/lib/utils/constants";
import { estimateTokens } from "@/lib/ingestion/chunker";

interface GroupedDocument {
  documentId: string;
  filename: string;
  documentTitle: string | null;
  documentType: string | null;
  caseNumber: string | null;
  highestSimilarity: number;
  chunks: Source[];
}

/**
 * Assemble context from retrieved chunks for the LLM.
 *
 * 1. Group chunks by document
 * 2. Rank documents by their highest-scoring chunk
 * 3. Budget tokens (cap at MAX_CONTEXT_TOKENS)
 * 4. Format as structured text blocks
 */
export function assembleContext(sources: Source[]): {
  contextText: string;
  usedSources: Source[];
} {
  if (sources.length === 0) {
    return { contextText: "No relevant documents were found.", usedSources: [] };
  }

  // Step 1: Group chunks by document
  const documentMap = new Map<string, GroupedDocument>();

  for (const source of sources) {
    const existing = documentMap.get(source.documentId);
    if (existing) {
      existing.chunks.push(source);
      if (source.similarity > existing.highestSimilarity) {
        existing.highestSimilarity = source.similarity;
      }
    } else {
      documentMap.set(source.documentId, {
        documentId: source.documentId,
        filename: source.filename,
        documentTitle: source.documentTitle,
        documentType: source.documentType,
        caseNumber: source.caseNumber,
        highestSimilarity: source.similarity,
        chunks: [source],
      });
    }
  }

  // Step 2: Rank documents by highest similarity
  const rankedDocs = Array.from(documentMap.values()).sort(
    (a, b) => b.highestSimilarity - a.highestSimilarity
  );

  // Step 3: Build context with token budget
  let totalTokens = 0;
  const contextParts: string[] = [];
  const usedSources: Source[] = [];
  let docIndex = 1;

  for (const doc of rankedDocs) {
    // Sort chunks within document by chunk index (original order)
    doc.chunks.sort((a, b) => {
      const aIdx = sources.indexOf(a);
      const bIdx = sources.indexOf(b);
      return aIdx - bIdx;
    });

    // Build document header
    const header = formatDocumentHeader(doc, docIndex);
    const headerTokens = estimateTokens(header);

    if (totalTokens + headerTokens > MAX_CONTEXT_TOKENS) break;

    let docText = header;
    totalTokens += headerTokens;

    // Add chunks within token budget
    for (const chunk of doc.chunks) {
      const chunkSection = formatChunkSection(chunk);
      const chunkTokens = estimateTokens(chunkSection);

      if (totalTokens + chunkTokens > MAX_CONTEXT_TOKENS) break;

      docText += chunkSection;
      totalTokens += chunkTokens;
      usedSources.push(chunk);
    }

    contextParts.push(docText);
    docIndex++;
  }

  return {
    contextText: contextParts.join("\n\n"),
    usedSources,
  };
}

function formatDocumentHeader(
  doc: GroupedDocument,
  index: number
): string {
  const lines = [`=== SOURCE DOCUMENT ${index} ===`];
  lines.push(`Filename: ${doc.filename}`);
  if (doc.documentTitle) lines.push(`Title: ${doc.documentTitle}`);
  if (doc.caseNumber) lines.push(`Case No: ${doc.caseNumber}`);
  if (doc.documentType) lines.push(`Type: ${doc.documentType}`);
  lines.push(`Relevance Score: ${doc.highestSimilarity.toFixed(2)}`);
  lines.push("");
  return lines.join("\n");
}

function formatChunkSection(chunk: Source): string {
  const parts: string[] = [];

  // Section header
  let sectionLine = "--- ";
  if (chunk.sectionTitle) sectionLine += `Section: ${chunk.sectionTitle}`;
  else sectionLine += "Content";

  const locationParts: string[] = [];
  if (chunk.pageNumbers && chunk.pageNumbers.length > 0) {
    const pages = chunk.pageNumbers.join(", ");
    locationParts.push(`Page${chunk.pageNumbers.length > 1 ? "s" : ""} ${pages}`);
  }
  if (chunk.paragraphNumbers) {
    locationParts.push(`Paragraph${chunk.paragraphNumbers.includes("-") ? "s" : ""} ${chunk.paragraphNumbers}`);
  }

  if (locationParts.length > 0) {
    sectionLine += ` (${locationParts.join(", ")})`;
  }
  sectionLine += " ---";

  parts.push(sectionLine);
  parts.push(chunk.content);
  parts.push("");

  return parts.join("\n");
}
