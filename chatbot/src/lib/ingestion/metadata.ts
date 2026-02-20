/**
 * Extracts structured metadata from legal document text using GPT-4o-mini.
 * Uses structured outputs to guarantee a clean JSON response.
 *
 * This replaces the previous regex-based approach which was fragile
 * against varied PDF formatting (line numbers, split lines, OCR artifacts).
 */

import { openai } from "@/lib/openai/client";
import { METADATA_MODEL } from "@/lib/utils/constants";

export interface DocumentMetadata {
  title: string | null;
  documentType: string | null;
  parties: string[] | null;
  jurisdiction: string | null;
  caseNumber: string | null;
  dateFiled: string | null;
  author: string | null;
  dollarAmounts: string[] | null;
  contractForm: string | null;
  witnesses: string[] | null;
}

const EXTRACTION_PROMPT = `You are a legal document metadata extractor. Analyze the provided text from a legal document and extract the following fields.

Rules:
- Extract ONLY what is explicitly stated in the text. Do not infer or guess.
- For "title": Use the case caption format "Plaintiff v. Defendant" (e.g., "Green Valley Alliance v. OmniCorp Development Group"). Use the full proper names of the parties, not abbreviations. For non-litigation documents, use the document title or heading.
- For "document_type": Classify as one of: complaint, motion, brief, deposition, contract, agreement, memo, order. Use lowercase.
- For "parties": List all named parties (plaintiffs, defendants, petitioners, respondents, contracting parties). Use their full proper names.
- For "jurisdiction": The court and jurisdiction (e.g., "United States District Court, Western District of Washington").
- For "case_number": The docket or case number exactly as written (e.g., "1:26-cv-09281-GLR").
- For "date_filed": The filing date in ISO format YYYY-MM-DD. Look for "DATED:", "Filed:", or similar indicators.
- For "author": The person or law firm that drafted or authored the document. Look for "Prepared by:", "Drafted by:", "Attorney for Plaintiff/Defendant:", or signature blocks.
- For "dollar_amounts": Key monetary values mentioned in the document with brief context, formatted as strings (e.g., "$5,000,000 liability cap", "$500,000 settlement amount"). Include the most significant amounts only.
- For "contract_form": The standard form template used, if any (e.g., "AIA A201", "ConsensusDocs 200", "EJCDC C-700"). Return null if the document is not based on a standard form.
- For "witnesses": Names of witnesses, experts, or deponents mentioned (for depositions, affidavits, or witness lists). Return null if none are found.
- If a field cannot be determined from the text, return null for that field.`;

/**
 * Extract metadata from legal document text using GPT-4o-mini with structured outputs.
 * Sends the full document text for thorough analysis.
 */
export async function extractMetadata(
  text: string
): Promise<DocumentMetadata> {
  try {
    const response = await openai.chat.completions.create({
      model: METADATA_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: text },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "document_metadata",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: {
                type: ["string", "null"],
                description:
                  'Case caption in "Plaintiff v. Defendant" format, or null if not a litigation document',
              },
              document_type: {
                type: ["string", "null"],
                enum: [
                  "complaint",
                  "motion",
                  "brief",
                  "deposition",
                  "contract",
                  "agreement",
                  "memo",
                  "order",
                  null,
                ],
                description: "Type of legal document",
              },
              parties: {
                type: ["array", "null"],
                items: { type: "string" },
                description: "Full names of all parties involved",
              },
              jurisdiction: {
                type: ["string", "null"],
                description: "Court name and jurisdiction",
              },
              case_number: {
                type: ["string", "null"],
                description: "Docket or case number",
              },
              date_filed: {
                type: ["string", "null"],
                description: "Filing date in YYYY-MM-DD format",
              },
              author: {
                type: ["string", "null"],
                description:
                  "Person or firm that authored/drafted the document",
              },
              dollar_amounts: {
                type: ["array", "null"],
                items: { type: "string" },
                description:
                  "Key monetary values with context (e.g., '$5M liability cap')",
              },
              contract_form: {
                type: ["string", "null"],
                description:
                  "Standard form template used (e.g., 'AIA A201')",
              },
              witnesses: {
                type: ["array", "null"],
                items: { type: "string" },
                description: "Names of witnesses or deponents",
              },
            },
            required: [
              "title",
              "document_type",
              "parties",
              "jurisdiction",
              "case_number",
              "date_filed",
              "author",
              "dollar_amounts",
              "contract_form",
              "witnesses",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.warn("Metadata extraction returned empty response, using nulls");
      return nullMetadata();
    }

    const parsed = JSON.parse(content);

    return {
      title: parsed.title ?? null,
      documentType: parsed.document_type ?? null,
      parties:
        Array.isArray(parsed.parties) && parsed.parties.length > 0
          ? parsed.parties
          : null,
      jurisdiction: parsed.jurisdiction ?? null,
      caseNumber: parsed.case_number ?? null,
      dateFiled: parsed.date_filed ?? null,
      author: parsed.author ?? null,
      dollarAmounts:
        Array.isArray(parsed.dollar_amounts) &&
        parsed.dollar_amounts.length > 0
          ? parsed.dollar_amounts
          : null,
      contractForm: parsed.contract_form ?? null,
      witnesses:
        Array.isArray(parsed.witnesses) && parsed.witnesses.length > 0
          ? parsed.witnesses
          : null,
    };
  } catch (error) {
    console.error(
      "Metadata extraction failed, falling back to nulls:",
      error instanceof Error ? error.message : error
    );
    return nullMetadata();
  }
}

function nullMetadata(): DocumentMetadata {
  return {
    title: null,
    documentType: null,
    parties: null,
    jurisdiction: null,
    caseNumber: null,
    dateFiled: null,
    author: null,
    dollarAmounts: null,
    contractForm: null,
    witnesses: null,
  };
}
