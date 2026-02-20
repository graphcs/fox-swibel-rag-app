import type { ChatCompletionTool } from "openai/resources/chat/completions";

// ============================================================
// Tool argument types (parsed from GPT's function call JSON)
// ============================================================

export interface SearchDocumentsArgs {
  query?: string;
  document_type?: string;
  jurisdiction?: string;
  date_from?: string;
  date_to?: string;
  party?: string;
  author?: string;
  contract_form?: string;
  witness?: string;
  max_results?: number;
}

export interface ListDocumentsArgs {
  document_type?: string;
}

// ============================================================
// Tool definitions for the OpenAI API
// ============================================================

export const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_documents",
      description:
        "Search the firm's uploaded legal documents using semantic similarity. " +
        "Use this to find relevant document chunks based on a legal concept, clause, " +
        "or topic. You can optionally filter by document type, jurisdiction, date range, " +
        "party name, author, contract form, or witness. Returns ranked document excerpts " +
        "with metadata and citations.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The search query describing the legal concept, clause, or topic to find. " +
              "Be specific and use legal terminology. " +
              'Examples: "standard of care breach", "force majeure clause". ' +
              "Optional when using filters to browse documents by metadata.",
          },
          document_type: {
            type: "string",
            enum: [
              "complaint",
              "motion",
              "brief",
              "deposition",
              "contract",
              "agreement",
              "memo",
              "order",
            ],
            description:
              "Filter results to a specific document type. " +
              "Use 'motion' for motions for summary judgment, motions to dismiss, etc. " +
              "Use 'contract' for subcontracts, purchase agreements, etc. " +
              "Use 'agreement' for indemnity agreements, settlement agreements, etc.",
          },
          jurisdiction: {
            type: "string",
            description:
              "Filter by jurisdiction or venue. Partial match supported. " +
              'Examples: "California", "Ninth Circuit", "Northern District of Illinois"',
          },
          date_from: {
            type: "string",
            description:
              'Start of date range filter (ISO format YYYY-MM-DD). Example: "2021-01-01"',
          },
          date_to: {
            type: "string",
            description:
              'End of date range filter (ISO format YYYY-MM-DD). Example: "2026-12-31"',
          },
          party: {
            type: "string",
            description:
              'Filter by party name. Partial match supported. Example: "Green Valley", "OmniCorp"',
          },
          author: {
            type: "string",
            description:
              "Filter by document author or drafter. Partial match supported. " +
              'Example: "Smith & Associates", "Jane Doe"',
          },
          contract_form: {
            type: "string",
            description:
              "Filter by standard contract form template. Partial match supported. " +
              'Examples: "AIA A201", "ConsensusDocs 200", "EJCDC C-700"',
          },
          witness: {
            type: "string",
            description:
              "Filter by witness or deponent name. Partial match supported. " +
              'Example: "Dr. Johnson", "Smith"',
          },
          max_results: {
            type: "number",
            description:
              "Maximum number of chunks to return (default 15, max 30). " +
              "Use a higher number when the user asks for comprehensive results.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_documents",
      description:
        "List all uploaded documents in the system with their metadata. " +
        "Use this to see what documents are available before searching, " +
        "or when the user asks what documents have been uploaded. " +
        "Optionally filter by document type. Returns metadata only, not content.",
      parameters: {
        type: "object",
        properties: {
          document_type: {
            type: "string",
            enum: [
              "complaint",
              "motion",
              "brief",
              "deposition",
              "contract",
              "agreement",
              "memo",
              "order",
            ],
            description: "Filter to only show documents of a specific type.",
          },
        },
      },
    },
  },
];
