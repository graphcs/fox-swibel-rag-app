"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UploadForm } from "@/components/admin/upload-form";
import { DocumentList } from "@/components/admin/document-list";
import { useUpload, useDocuments } from "@/hooks/use-upload";

export default function AdminPage() {
  const { documents, isLoading, error: listError, fetchDocuments, deleteDocument } =
    useDocuments();

  const { isUploading, progress, error: uploadError, uploadFile } =
    useUpload(() => {
      // On upload complete, refresh the documents list
      fetchDocuments();
    });

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll for processing documents
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasProcessing = documents.some((d) => d.status === "processing");

  useEffect(() => {
    if (hasProcessing) {
      pollIntervalRef.current = setInterval(() => {
        fetchDocuments();
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [hasProcessing, fetchDocuments]);

  return (
    <main className="min-h-dvh bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Chat
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">
              Document Manager
            </h1>
            <p className="text-xs text-zinc-500">
              Upload and manage legal documents for Jannet
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {/* Upload Section */}
        <section>
          <h2 className="mb-4 text-sm font-semibold text-zinc-800">
            Upload Document
          </h2>
          <UploadForm
            onUpload={uploadFile}
            isUploading={isUploading}
            progress={progress}
            error={uploadError}
          />
        </section>

        {/* Documents Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-800">
              Uploaded Documents
            </h2>
            <span className="text-xs text-zinc-500">
              {documents.length} document{documents.length !== 1 ? "s" : ""}
            </span>
          </div>

          {listError && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {listError}
            </p>
          )}

          <DocumentList
            documents={documents}
            onDelete={deleteDocument}
            isLoading={isLoading}
          />
        </section>
      </div>
    </main>
  );
}
