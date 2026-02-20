// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import { ExtractionError } from "@/lib/utils/errors";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface PdfExtractionResult {
  fullText: string;
  pages: ExtractedPage[];
  pageCount: number;
}

export async function extractPdf(
  buffer: Buffer
): Promise<PdfExtractionResult> {
  try {
    // Use pdf-parse v1 API: pdfParse(buffer, options) -> Promise<{text, numpages, ...}>
    const pages: ExtractedPage[] = [];
    let currentPage = 0;

    const result = await pdfParse(buffer, {
      // Custom page renderer to capture per-page text
      pagerender: async (pageData: {
        getTextContent: () => Promise<{
          items: Array<{ str: string }>;
        }>;
      }) => {
        currentPage++;
        const textContent = await pageData.getTextContent();
        const pageText = textContent.items
          .map((item) => item.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        pages.push({ pageNumber: currentPage, text: pageText });
        return pageText;
      },
    });

    return {
      fullText: result.text,
      pages:
        pages.length > 0 ? pages : [{ pageNumber: 1, text: result.text }],
      pageCount: result.numpages,
    };
  } catch (error) {
    throw new ExtractionError(
      `PDF extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "pdf"
    );
  }
}
