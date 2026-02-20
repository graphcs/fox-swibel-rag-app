export class IngestionError extends Error {
  constructor(
    message: string,
    public documentId?: string
  ) {
    super(message);
    this.name = "IngestionError";
  }
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    public fileType?: string
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

export class EmbeddingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbeddingError";
  }
}

export class SearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchError";
  }
}
