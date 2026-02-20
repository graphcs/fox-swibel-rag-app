import mammoth from "mammoth";
import { ExtractionError } from "@/lib/utils/errors";

export interface DocxExtractionResult {
  fullText: string;
  pageCount: number | null; // DOCX doesn't have reliable page info
}

export async function extractDocx(
  buffer: Buffer
): Promise<DocxExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    if (!result.value || result.value.trim().length === 0) {
      throw new Error("No text content found in DOCX file");
    }

    return {
      fullText: result.value,
      pageCount: null, // DOCX files don't have fixed pages
    };
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError(
      `DOCX extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "docx"
    );
  }
}
