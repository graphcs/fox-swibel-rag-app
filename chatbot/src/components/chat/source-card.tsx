"use client";

import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Source } from "@/types/chat";

interface SourceCardProps {
  source: Source;
  index: number;
}

export function SourceCard({ source, index }: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const locationParts: string[] = [];
  if (source.pageNumbers && source.pageNumbers.length > 0) {
    locationParts.push(`p. ${source.pageNumbers.join(", ")}`);
  }
  if (source.sectionTitle) {
    locationParts.push(source.sectionTitle);
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
              {Math.round(source.similarity * 100)}%
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
        <div className="border-t border-zinc-200 px-3 py-2">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-600">
            {source.content}
          </p>
        </div>
      )}
    </div>
  );
}
