"use client";

import { Trash2, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Document } from "@/types/documents";

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
  isLoading: boolean;
}

function StatusBadge({ status }: { status: Document["status"] }) {
  switch (status) {
    case "ready":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Ready
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertCircle className="h-3 w-3" />
          Error
        </span>
      );
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DocumentList({ documents, onDelete, isLoading }: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="mb-3 h-10 w-10 text-zinc-300" />
        <p className="text-sm font-medium text-zinc-700">No documents uploaded</p>
        <p className="mt-1 text-xs text-zinc-500">
          Upload PDF or DOCX files to get started
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[45%] sm:w-[40%]" />
          <col className="hidden sm:table-column w-[8%]" />
          <col className="w-[15%] sm:w-[12%]" />
          <col className="hidden md:table-column w-[8%]" />
          <col className="hidden md:table-column w-[18%]" />
          <col className="w-[10%] sm:w-[7%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-4 py-3 text-xs font-semibold text-zinc-600">Document</th>
            <th className="hidden px-4 py-3 text-xs font-semibold text-zinc-600 sm:table-cell">Type</th>
            <th className="px-4 py-3 text-xs font-semibold text-zinc-600">Status</th>
            <th className="hidden px-4 py-3 text-xs font-semibold text-zinc-600 md:table-cell">Chunks</th>
            <th className="hidden px-4 py-3 text-xs font-semibold text-zinc-600 md:table-cell">Uploaded</th>
            <th className="px-4 py-3 text-xs font-semibold text-zinc-600 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.id}
              className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-800">
                      {doc.title || doc.filename}
                    </p>
                    {doc.title && (
                      <p className="truncate text-xs text-zinc-500">
                        {doc.filename} ({formatFileSize(doc.fileSize)})
                      </p>
                    )}
                    {!doc.title && (
                      <p className="text-xs text-zinc-500">
                        {formatFileSize(doc.fileSize)}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 uppercase">
                  {doc.fileType}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={doc.status} />
                {doc.status === "error" && doc.errorMessage && (
                  <p className="mt-0.5 text-xs text-red-500 truncate max-w-[200px]" title={doc.errorMessage}>
                    {doc.errorMessage}
                  </p>
                )}
              </td>
              <td className="hidden px-4 py-3 text-zinc-600 md:table-cell">
                {doc.chunkCount || "-"}
              </td>
              <td className="hidden px-4 py-3 text-xs text-zinc-500 md:table-cell">
                {formatDate(doc.createdAt)}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => {
                    if (confirm(`Delete "${doc.filename}"? This will remove all associated data.`)) {
                      onDelete(doc.id);
                    }
                  }}
                  className={cn(
                    "rounded p-1.5 text-zinc-400 transition-colors",
                    "hover:bg-red-50 hover:text-red-600"
                  )}
                  aria-label={`Delete ${doc.filename}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
