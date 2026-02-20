"use client";

import { useState, useCallback } from "react";
import type { Document } from "@/types/documents";

interface UploadState {
  isUploading: boolean;
  progress: string;
  error: string | null;
}

export function useUpload(onUploadComplete?: () => void) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: "",
    error: null,
  });

  const uploadFile = useCallback(
    async (file: File) => {
      setUploadState({ isUploading: true, progress: "Uploading...", error: null });

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        setUploadState({
          isUploading: false,
          progress: "Uploaded! Processing in background...",
          error: null,
        });

        onUploadComplete?.();
      } catch (error) {
        setUploadState({
          isUploading: false,
          progress: "",
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    },
    [onUploadComplete]
  );

  const clearState = useCallback(() => {
    setUploadState({ isUploading: false, progress: "", error: null });
  }, []);

  return { ...uploadState, uploadFile, clearState };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/documents");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch documents");
      }

      setDocuments(data.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/documents?id=${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to delete document");
        }

        // Remove from local state
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete document");
      }
    },
    []
  );

  return { documents, isLoading, error, fetchDocuments, deleteDocument };
}
