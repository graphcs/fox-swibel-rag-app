// Embedding model
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_BATCH_SIZE = 500;

// Chat model
export const CHAT_MODEL = "gpt-4o";
export const CHAT_TEMPERATURE = 0.1;

// Metadata extraction model (cheap + fast, used during ingestion)
export const METADATA_MODEL = "gpt-4o-mini";

// Chunking
export const CHUNK_TARGET_TOKENS = 800;
export const CHUNK_MAX_TOKENS = 1200;
export const CHUNK_OVERLAP_PARAGRAPHS = 1;

// RAG retrieval
export const MATCH_THRESHOLD = 0.5;
export const MATCH_COUNT = 15;
export const MAX_CONTEXT_TOKENS = 12000;
export const MAX_TOOL_ITERATIONS = 3;

// Upload limits
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const ALLOWED_FILE_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] as const;
export const ALLOWED_EXTENSIONS = ["pdf", "docx"] as const;
