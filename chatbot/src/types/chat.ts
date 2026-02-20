export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isSearching?: boolean;
}

export interface Source {
  chunkId: string;
  documentId: string;
  filename: string;
  documentTitle: string | null;
  documentType: string | null;
  caseNumber: string | null;
  sectionTitle: string | null;
  pageNumbers: number[] | null;
  paragraphNumbers: string | null;
  similarity: number;
  content: string;
}

export interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
}

export type StreamEventType =
  | "sources"
  | "text_delta"
  | "done"
  | "error"
  | "tool_call";

export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  sources?: Source[];
  message?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}
