"use client";

import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Source } from "@/types/chat";

export interface GroupedSource {
  documentId: string;
  documentTitle: string | null;
  filename: string;
  documentType: string | null;
  caseNumber: string | null;
  highestSimilarity: number;
  pageNumbers: number[];
  chunks: Source[];
}

/**
 * Group per-chunk sources into one entry per document.
 */
export function groupSourcesByDocument(sources: Source[]): GroupedSource[] {
  const map = new Map<string, GroupedSource>();

  for (const source of sources) {
    const existing = map.get(source.documentId);
    if (existing) {
      if (source.similarity > existing.highestSimilarity) {
        existing.highestSimilarity = source.similarity;
      }
      if (source.pageNumbers) {
        for (const p of source.pageNumbers) {
          if (!existing.pageNumbers.includes(p)) {
            existing.pageNumbers.push(p);
          }
        }
      }
      existing.chunks.push(source);
    } else {
      map.set(source.documentId, {
        documentId: source.documentId,
        documentTitle: source.documentTitle,
        filename: source.filename,
        documentType: source.documentType,
        caseNumber: source.caseNumber,
        highestSimilarity: source.similarity,
        pageNumbers: source.pageNumbers ? [...source.pageNumbers] : [],
        chunks: [source],
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.highestSimilarity - a.highestSimilarity);
}

interface SourceCardProps {
  source: GroupedSource;
  index: number;
}

export function SourceCard({ source, index }: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedPages = [...source.pageNumbers].sort((a, b) => a - b);

  const locationParts: string[] = [];
  if (sortedPages.length > 0) {
    locationParts.push(`p. ${sortedPages.join(", ")}`);
  }
  if (source.documentType) {
    locationParts.push(source.documentType);
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200 bg-zinc-50 text-sm",
        "transition-colors hover:border-zinc-300"
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-start gap-2 p-3 text-left"
      >
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900 text-xs">
              [{index + 1}]
            </span>
            <span className="truncate font-medium text-zinc-700">
              {source.documentTitle || source.filename}
            </span>
            <span className="ml-auto shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
              {Math.round(source.highestSimilarity * 100)}%
            </span>
          </div>
          {locationParts.length > 0 && (
            <p className="mt-0.5 text-xs text-zinc-500">
              {locationParts.join(" | ")}
            </p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        ) : (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-200 px-3 py-2 space-y-2">
          {source.chunks.map((chunk) => (
            <div key={chunk.chunkId}>
              {chunk.sectionTitle && (
                <p className="text-xs font-medium text-zinc-500 mb-0.5">
                  {chunk.sectionTitle}
                  {chunk.pageNumbers && chunk.pageNumbers.length > 0 &&
                    ` (p. ${chunk.pageNumbers.join(", ")})`}
                </p>
              )}
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-600">
                {chunk.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
