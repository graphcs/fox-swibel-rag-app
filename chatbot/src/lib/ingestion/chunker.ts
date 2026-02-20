import {
  CHUNK_TARGET_TOKENS,
  CHUNK_MAX_TOKENS,
  CHUNK_OVERLAP_PARAGRAPHS,
} from "@/lib/utils/constants";

export interface ChunkResult {
  content: string;
  sectionTitle: string | null;
  pageNumbers: number[] | null;
  paragraphNumbers: string | null;
  tokenCount: number;
}

interface Section {
  title: string | null;
  body: string;
  startOffset: number;
}

// ============================================================
// Token estimation
// ============================================================

/**
 * Fast approximate token count. For English text, ~1.3 tokens per word
 * is a reliable heuristic for GPT tokenizers (cl100k_base).
 */
export function estimateTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

// ============================================================
// Pass 1: Section Detection
// ============================================================

const SECTION_PATTERNS: RegExp[] = [
  // Roman numeral headers: "I. THE PARTIES", "IV. CAUSES OF ACTION"
  /^([IVXLCDM]+)\.\s+([A-Z][A-Z\s,&]+)$/,
  // Named legal sections
  /^((?:FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)\s+CAUSE\s+OF\s+ACTION.*)$/,
  /^(PRAYER\s+FOR\s+RELIEF.*)$/,
  /^(SUBSEQUENT\s+VIOLATION\s*.*)$/,
  /^(COUNT\s+[IVXLCDM]+:.*)$/,
  /^(DEVELOPMENT)$/,
  // Bold/uppercase headers (5+ chars, all uppercase)
  /^([A-Z][A-Z\s]{4,})$/,
];

function isSectionHeader(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 120) return null;

  for (const pattern of SECTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return trimmed;
    }
  }
  return null;
}

function detectSections(text: string): Section[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let currentTitle: string | null = null;
  let currentBody = "";
  let currentOffset = 0;

  for (const line of lines) {
    const headerTitle = isSectionHeader(line);

    if (headerTitle) {
      // Save the previous section if it has content
      if (currentBody.trim().length > 0) {
        sections.push({
          title: currentTitle,
          body: currentBody.trim(),
          startOffset: currentOffset,
        });
      }
      currentTitle = headerTitle;
      currentBody = "";
      currentOffset += line.length + 1;
    } else {
      currentBody += line + "\n";
    }
  }

  // Push the final section
  if (currentBody.trim().length > 0) {
    sections.push({
      title: currentTitle,
      body: currentBody.trim(),
      startOffset: currentOffset,
    });
  }

  // If no sections were detected, treat the entire text as one section
  if (sections.length === 0) {
    sections.push({
      title: null,
      body: text.trim(),
      startOffset: 0,
    });
  }

  return sections;
}

// ============================================================
// Pass 2: Paragraph-Aware Chunking Within Sections
// ============================================================

/**
 * Split section text into numbered paragraphs.
 * Legal documents use patterns like "1.", "2.", "10." at the start of lines.
 */
function splitIntoParagraphs(text: string): string[] {
  // Split on numbered paragraph boundaries (e.g., "1. ", "10. ", "25. ")
  const parts = text.split(/(?=^\d+\.\s+)/m);
  const paragraphs: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      paragraphs.push(trimmed);
    }
  }

  // If no numbered paragraphs found, split by double newlines
  if (paragraphs.length <= 1 && text.length > 0) {
    const byDoubleNewline = text.split(/\n\s*\n/);
    if (byDoubleNewline.length > 1) {
      return byDoubleNewline.map((p) => p.trim()).filter(Boolean);
    }
  }

  return paragraphs.length > 0 ? paragraphs : [text.trim()];
}

/**
 * Extract the paragraph number from a paragraph string.
 * Returns null if no number is found.
 */
function extractParagraphNumber(paragraph: string): string | null {
  const match = paragraph.match(/^(\d+)\.\s+/);
  return match ? match[1] : null;
}

/**
 * Chunk a list of paragraphs respecting token limits and adding overlap.
 */
function chunkParagraphs(
  paragraphs: string[],
  sectionTitle: string | null
): ChunkResult[] {
  const chunks: ChunkResult[] = [];
  let currentParagraphs: string[] = [];
  let currentTokens = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const paraTokens = estimateTokens(para);

    // If a single paragraph exceeds max, split it by sentences
    if (paraTokens > CHUNK_MAX_TOKENS) {
      // Flush current accumulated paragraphs first
      if (currentParagraphs.length > 0) {
        chunks.push(
          buildChunk(currentParagraphs, sectionTitle)
        );
        currentParagraphs = [];
        currentTokens = 0;
      }
      // Split the large paragraph into sentence-level chunks
      const sentenceChunks = chunkBySentences(para, sectionTitle);
      chunks.push(...sentenceChunks);
      continue;
    }

    // Would adding this paragraph exceed the target?
    if (
      currentTokens + paraTokens > CHUNK_TARGET_TOKENS &&
      currentParagraphs.length > 0
    ) {
      // Emit current chunk
      chunks.push(
        buildChunk(currentParagraphs, sectionTitle)
      );

      // Overlap: carry the last N paragraphs into the next chunk
      const overlapStart = Math.max(
        0,
        currentParagraphs.length - CHUNK_OVERLAP_PARAGRAPHS
      );
      const overlapParagraphs = currentParagraphs.slice(overlapStart);
      currentParagraphs = [...overlapParagraphs];
      currentTokens = overlapParagraphs.reduce(
        (sum, p) => sum + estimateTokens(p),
        0
      );
    }

    currentParagraphs.push(para);
    currentTokens += paraTokens;
  }

  // Flush remaining
  if (currentParagraphs.length > 0) {
    chunks.push(buildChunk(currentParagraphs, sectionTitle));
  }

  return chunks;
}

/**
 * Fallback: split a very long paragraph into sentence-level chunks.
 */
function chunkBySentences(
  text: string,
  sectionTitle: string | null
): ChunkResult[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: ChunkResult[] = [];
  let currentSentences: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentTokens = estimateTokens(sentence);

    if (
      currentTokens + sentTokens > CHUNK_TARGET_TOKENS &&
      currentSentences.length > 0
    ) {
      const content = currentSentences.join(" ").trim();
      chunks.push({
        content,
        sectionTitle,
        pageNumbers: null,
        paragraphNumbers: null,
        tokenCount: estimateTokens(content),
      });
      currentSentences = [];
      currentTokens = 0;
    }

    currentSentences.push(sentence.trim());
    currentTokens += sentTokens;
  }

  if (currentSentences.length > 0) {
    const content = currentSentences.join(" ").trim();
    chunks.push({
      content,
      sectionTitle,
      pageNumbers: null,
      paragraphNumbers: null,
      tokenCount: estimateTokens(content),
    });
  }

  return chunks;
}

/**
 * Build a ChunkResult from accumulated paragraphs.
 */
function buildChunk(
  paragraphs: string[],
  sectionTitle: string | null
): ChunkResult {
  const content = paragraphs.join("\n\n");
  const firstNum = extractParagraphNumber(paragraphs[0]);
  const lastNum = extractParagraphNumber(paragraphs[paragraphs.length - 1]);

  let paragraphNumbers: string | null = null;
  if (firstNum && lastNum) {
    paragraphNumbers = firstNum === lastNum ? firstNum : `${firstNum}-${lastNum}`;
  } else if (firstNum) {
    paragraphNumbers = firstNum;
  }

  return {
    content,
    sectionTitle,
    pageNumbers: null, // Will be enriched in Pass 3
    paragraphNumbers,
    tokenCount: estimateTokens(content),
  };
}

// ============================================================
// Pass 3: Page Number Assignment
// ============================================================

/**
 * Assign page numbers to chunks based on page boundary character offsets.
 */
function assignPageNumbers(
  chunks: ChunkResult[],
  fullText: string,
  pageTexts: { pageNumber: number; text: string }[]
): void {
  if (pageTexts.length <= 1) {
    // Single page or no page info - assign page 1 to all
    for (const chunk of chunks) {
      chunk.pageNumbers = [1];
    }
    return;
  }

  // Build a map of which character ranges belong to which pages
  const pageRanges: { pageNumber: number; start: number; end: number }[] = [];
  let offset = 0;

  for (const page of pageTexts) {
    const idx = fullText.indexOf(page.text, offset);
    if (idx >= 0) {
      pageRanges.push({
        pageNumber: page.pageNumber,
        start: idx,
        end: idx + page.text.length,
      });
      offset = idx + page.text.length;
    }
  }

  // For each chunk, find which pages its content appears in
  for (const chunk of chunks) {
    const chunkStart = fullText.indexOf(chunk.content);
    if (chunkStart < 0) continue;
    const chunkEnd = chunkStart + chunk.content.length;

    const pages = new Set<number>();
    for (const range of pageRanges) {
      // Check if there's any overlap
      if (chunkStart < range.end && chunkEnd > range.start) {
        pages.add(range.pageNumber);
      }
    }

    chunk.pageNumbers =
      pages.size > 0 ? Array.from(pages).sort((a, b) => a - b) : null;
  }
}

// ============================================================
// Main Entry Point
// ============================================================

export function chunkDocument(
  fullText: string,
  pageTexts?: { pageNumber: number; text: string }[]
): ChunkResult[] {
  if (!fullText || fullText.trim().length === 0) {
    return [];
  }

  // Pass 1: Detect sections
  const sections = detectSections(fullText);

  // Pass 2: Chunk within each section
  const allChunks: ChunkResult[] = [];
  for (const section of sections) {
    const paragraphs = splitIntoParagraphs(section.body);
    const sectionChunks = chunkParagraphs(paragraphs, section.title);
    allChunks.push(...sectionChunks);
  }

  // Pass 3: Assign page numbers if page info is available
  if (pageTexts && pageTexts.length > 0) {
    assignPageNumbers(allChunks, fullText, pageTexts);
  }

  return allChunks;
}
