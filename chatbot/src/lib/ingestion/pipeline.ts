import { extractPdf } from "./extractors/pdf-extractor";
import { extractDocx } from "./extractors/docx-extractor";
import { chunkDocument } from "./chunker";
import { extractMetadata } from "./metadata";
import { embedBatch } from "@/lib/openai/embeddings";
import {
  insertChunks,
  updateDocumentReady,
  updateDocumentError,
} from "@/lib/supabase/queries";
import { IngestionError } from "@/lib/utils/errors";

/**
 * Full document ingestion pipeline:
 * file buffer → extract text → chunk → embed → store in Supabase
 *
 * This function is designed to run in the background after the upload API
 * returns a 202 to the client.
 */
export async function ingestDocument(
  documentId: string,
  buffer: Buffer,
  fileType: "pdf" | "docx"
): Promise<void> {
  try {
    // Step 1: Extract text from file
    let fullText: string;
    let pageTexts: { pageNumber: number; text: string }[] | undefined;
    let pageCount: number | null = null;

    if (fileType === "pdf") {
      const result = await extractPdf(buffer);
      fullText = result.fullText;
      pageTexts = result.pages;
      pageCount = result.pageCount;
    } else {
      const result = await extractDocx(buffer);
      fullText = result.fullText;
      pageCount = result.pageCount;
    }

    if (!fullText || fullText.trim().length === 0) {
      throw new IngestionError(
        "No text content could be extracted from the file",
        documentId
      );
    }

    // Step 2: Extract document metadata
    const metadata = await extractMetadata(fullText);

    // Step 3: Chunk the document
    const chunks = chunkDocument(fullText, pageTexts);

    if (chunks.length === 0) {
      throw new IngestionError(
        "Document produced no chunks after processing",
        documentId
      );
    }

    // Step 4: Generate embeddings for all chunks
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await embedBatch(chunkTexts);

    // Step 5: Store chunks with embeddings in Supabase
    const chunkRows = chunks.map((chunk, index) => ({
      documentId,
      chunkIndex: index,
      content: chunk.content,
      sectionTitle: chunk.sectionTitle,
      pageNumbers: chunk.pageNumbers,
      paragraphNumbers: chunk.paragraphNumbers,
      tokenCount: chunk.tokenCount,
      embedding: embeddings[index],
    }));

    await insertChunks(chunkRows);

    // Step 6: Update document status to ready
    await updateDocumentReady(documentId, {
      title: metadata.title ?? undefined,
      documentType: metadata.documentType ?? undefined,
      parties: metadata.parties ?? undefined,
      jurisdiction: metadata.jurisdiction ?? undefined,
      caseNumber: metadata.caseNumber ?? undefined,
      dateFiled: metadata.dateFiled ?? undefined,
      author: metadata.author ?? undefined,
      dollarAmounts: metadata.dollarAmounts ?? undefined,
      contractForm: metadata.contractForm ?? undefined,
      witnesses: metadata.witnesses ?? undefined,
      pageCount: pageCount ?? undefined,
      chunkCount: chunks.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown ingestion error";
    console.error(`Ingestion failed for document ${documentId}:`, message);
    await updateDocumentError(documentId, message);
  }
}
