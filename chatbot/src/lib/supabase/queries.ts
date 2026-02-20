import { supabase } from "./client";
import type { Document } from "@/types/documents";
import type { Source } from "@/types/chat";
import { MATCH_THRESHOLD, MATCH_COUNT } from "@/lib/utils/constants";

// ============================================================
// Documents
// ============================================================

export async function insertDocument(doc: {
  filename: string;
  fileType: "pdf" | "docx";
  fileSize: number;
}): Promise<string> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      filename: doc.filename,
      file_type: doc.fileType,
      file_size: doc.fileSize,
      status: "processing",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to insert document: ${error.message}`);
  return data.id;
}

export async function updateDocumentReady(
  documentId: string,
  metadata: {
    title?: string;
    documentType?: string;
    parties?: string[];
    jurisdiction?: string;
    caseNumber?: string;
    dateFiled?: string;
    author?: string;
    dollarAmounts?: string[];
    contractForm?: string;
    witnesses?: string[];
    pageCount?: number;
    chunkCount: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({
      status: "ready",
      title: metadata.title,
      document_type: metadata.documentType,
      parties: metadata.parties,
      jurisdiction: metadata.jurisdiction,
      case_number: metadata.caseNumber,
      date_filed: metadata.dateFiled,
      author: metadata.author,
      dollar_amounts: metadata.dollarAmounts,
      contract_form: metadata.contractForm,
      witnesses: metadata.witnesses,
      page_count: metadata.pageCount,
      chunk_count: metadata.chunkCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) throw new Error(`Failed to update document: ${error.message}`);
}

export async function updateDocumentError(
  documentId: string,
  errorMessage: string
): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({
      status: "error",
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error)
    console.error(`Failed to update document error status: ${error.message}`);
}

export async function listDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list documents: ${error.message}`);

  return (data || []).map((row) => ({
    id: row.id,
    filename: row.filename,
    fileType: row.file_type,
    fileSize: row.file_size,
    title: row.title,
    documentType: row.document_type,
    parties: row.parties,
    jurisdiction: row.jurisdiction,
    caseNumber: row.case_number,
    dateFiled: row.date_filed,
    author: row.author,
    dollarAmounts: row.dollar_amounts,
    contractForm: row.contract_form,
    witnesses: row.witnesses,
    pageCount: row.page_count,
    chunkCount: row.chunk_count,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function deleteDocument(documentId: string): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (error) throw new Error(`Failed to delete document: ${error.message}`);
}

// ============================================================
// Document Summaries (for list_documents tool)
// ============================================================

export async function listDocumentSummaries(): Promise<
  Array<{
    id: string;
    filename: string;
    title: string | null;
    documentType: string | null;
    jurisdiction: string | null;
    parties: string[] | null;
    dateFiled: string | null;
    caseNumber: string | null;
    author: string | null;
    dollarAmounts: string[] | null;
    contractForm: string | null;
    witnesses: string[] | null;
    chunkCount: number;
  }>
> {
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, filename, title, document_type, jurisdiction, parties, date_filed, case_number, author, dollar_amounts, contract_form, witnesses, chunk_count"
    )
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list documents: ${error.message}`);

  return (data || []).map((row) => ({
    id: row.id,
    filename: row.filename,
    title: row.title,
    documentType: row.document_type,
    jurisdiction: row.jurisdiction,
    parties: row.parties,
    dateFiled: row.date_filed,
    caseNumber: row.case_number,
    author: row.author,
    dollarAmounts: row.dollar_amounts,
    contractForm: row.contract_form,
    witnesses: row.witnesses,
    chunkCount: row.chunk_count ?? 0,
  }));
}

// ============================================================
// Chunks
// ============================================================

export async function insertChunks(
  chunks: Array<{
    documentId: string;
    chunkIndex: number;
    content: string;
    sectionTitle: string | null;
    pageNumbers: number[] | null;
    paragraphNumbers: string | null;
    tokenCount: number;
    embedding: number[];
  }>
): Promise<void> {
  const rows = chunks.map((chunk) => ({
    document_id: chunk.documentId,
    chunk_index: chunk.chunkIndex,
    content: chunk.content,
    section_title: chunk.sectionTitle,
    page_numbers: chunk.pageNumbers,
    paragraph_numbers: chunk.paragraphNumbers,
    token_count: chunk.tokenCount,
    embedding: chunk.embedding,
  }));

  const { error } = await supabase.from("document_chunks").insert(rows);

  if (error) throw new Error(`Failed to insert chunks: ${error.message}`);
}

// ============================================================
// Vector Search
// ============================================================

export async function searchChunks(
  queryEmbedding: number[],
  options?: {
    threshold?: number;
    count?: number;
    documentType?: string;
    jurisdiction?: string;
    dateFrom?: string;
    dateTo?: string;
    party?: string;
    author?: string;
    contractForm?: string;
    witness?: string;
  }
): Promise<Source[]> {
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: options?.threshold ?? MATCH_THRESHOLD,
    match_count: options?.count ?? MATCH_COUNT,
    filter_document_type: options?.documentType ?? null,
    filter_jurisdiction: options?.jurisdiction ?? null,
    filter_date_from: options?.dateFrom ?? null,
    filter_date_to: options?.dateTo ?? null,
    filter_party: options?.party ?? null,
    filter_author: options?.author ?? null,
    filter_contract_form: options?.contractForm ?? null,
    filter_witness: options?.witness ?? null,
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);

  return (data || []).map(
    (row: Record<string, unknown>): Source => ({
      chunkId: row.chunk_id as string,
      documentId: row.document_id as string,
      content: row.content as string,
      sectionTitle: row.section_title as string | null,
      pageNumbers: row.page_numbers as number[] | null,
      paragraphNumbers: row.paragraph_numbers as string | null,
      similarity: row.similarity as number,
      filename: row.filename as string,
      documentTitle: row.document_title as string | null,
      documentType: row.document_type as string | null,
      caseNumber: row.case_number as string | null,
    })
  );
}
