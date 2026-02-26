"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./message-bubble";
import type { Message } from "@/types/chat";

const EXAMPLE_CATEGORIES = [
  {
    label: "Document Overview",
    queries: [
      "Summarize all the cases in my database and their outcomes from all the uploaded documents.",
      "Which documents involve intellectual property or trade secrets?",
    ],
  },
  {
    label: "Case Analysis",
    queries: [
      "What are the causes of action in the environmental complaint?",
      "What evidence did OmniCorp allegedly suppress regarding the Blue Heron Wetlands project?",
    ],
  },
  {
    label: "Legal Research",
    queries: [
      "Under Florida law, can attorney's fees be awarded for litigating the amount of fees?",
      "What is the legal distinction between 'termination' and 'non-extension' of employment in the Johnston v. Medical Pharma case, and why does it matter for severance pay?",
    ],
  },
  {
    label: "Cross-Document Comparison",
    queries: [
      "What cases involve breach of contract claims? Compare the types of contracts at issue.",
      "Compare the standards of review discussed across the uploaded cases",
    ],
  },
  {
    label: "Specific Details",
    queries: [
      "How much data did Northstar allegedly exfiltrate from Vertex's Azure environment?",
      "What is section 61.16(1) of the Florida Statutes and how was it interpreted in the Schultheis case?",
    ],
  },
];

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  onExampleClick?: (text: string) => void;
}

export function MessageList({ messages, isStreaming, onExampleClick }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
              <svg
                className="h-7 w-7 text-zinc-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Your Legal AI Assistant
            </h2>
            <p className="mt-2 max-w-md text-sm text-zinc-500">
              Ask me about your uploaded legal documents — I can find relevant
              clauses, summarize motions, compare contracts, and more.
            </p>

            {/* Example queries by category */}
            <div className="mt-8 w-full max-w-xl">
              <p className="mb-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Try an example
              </p>
              <div className="space-y-1">
                {EXAMPLE_CATEGORIES.map((category) => {
                  const isExpanded = expandedCategory === category.label;
                  return (
                    <div key={category.label} className="rounded-lg border border-zinc-200 overflow-hidden">
                      <button
                        onClick={() =>
                          setExpandedCategory(isExpanded ? null : category.label)
                        }
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        {category.label}
                        <svg
                          className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-zinc-100 bg-zinc-50/50 px-3 py-2 space-y-1.5">
                          {category.queries.map((query) => (
                            <button
                              key={query}
                              onClick={() => onExampleClick?.(query)}
                              className="block w-full rounded-md bg-white border border-zinc-200 px-3 py-2 text-left text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100"
                            >
                              &ldquo;{query}&rdquo;
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={
              isStreaming &&
              idx === messages.length - 1 &&
              message.role === "assistant"
            }
          />
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
