"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Scale } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SourceCard, groupSourcesByDocument } from "./source-card";
import type { Message } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
          <Scale className="h-4 w-4" />
        </div>
      )}

      <div className={cn("max-w-[85%] space-y-2", isUser ? "items-end" : "items-start")}>
        {/* Message content */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-900"
          )}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-zinc max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="my-2 overflow-x-auto">
                      <table className="min-w-full text-xs">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-zinc-300 bg-zinc-200 px-2 py-1 text-left text-xs font-semibold">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-zinc-300 px-2 py-1 text-xs">
                      {children}
                    </td>
                  ),
                  p: ({ children }) => (
                    <p className="my-1.5 text-sm leading-relaxed">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-zinc-900">{children}</strong>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm leading-relaxed">{children}</li>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
              {message.isSearching && !message.content && (
                <div className="flex items-center gap-2 py-1">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                  <span className="text-xs text-zinc-500">Searching documents...</span>
                </div>
              )}
              {isStreaming && !message.content && !message.isSearching && (
                <div className="flex items-center gap-1 py-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source cards (grouped by document) */}
        {message.sources && message.sources.length > 0 && (() => {
          const grouped = groupSourcesByDocument(message.sources);
          return (
            <div className="space-y-1.5 pl-1">
              <p className="text-xs font-medium text-zinc-500">
                Sources ({grouped.length})
              </p>
              {grouped.map((source, idx) => (
                <SourceCard key={source.documentId} source={source} index={idx} />
              ))}
            </div>
          );
        })()}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
