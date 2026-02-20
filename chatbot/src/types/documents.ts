export interface Document {
  id: string;
  filename: string;
  fileType: "pdf" | "docx";
  fileSize: number;
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
  pageCount: number | null;
  chunkCount: number;
  status: "processing" | "ready" | "error";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  sectionTitle: string | null;
  pageNumbers: number[] | null;
  paragraphNumbers: string | null;
  tokenCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface UploadResponse {
  documentId: string;
  filename: string;
  status: "processing";
  message: string;
}
