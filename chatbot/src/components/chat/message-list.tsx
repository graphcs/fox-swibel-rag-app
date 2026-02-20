"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import type { Message } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
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
              Hi, I&apos;m Jannet
            </h2>
            <p className="mt-2 max-w-md text-sm text-zinc-500">
              Your Fox & Swibel legal research assistant. Ask me about your
              uploaded legal documents — I can find relevant clauses, summarize
              motions, compare contracts, and more.
            </p>
            <div className="mt-6 grid gap-2">
              <ExampleQuery text="Find all breach of contract claims in the uploaded documents" />
              <ExampleQuery text="Summarize the causes of action in the environmental complaint" />
              <ExampleQuery text="What are the key factual allegations in the tech dispute case?" />
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

function ExampleQuery({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-zinc-200 px-3 py-2 text-left text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50">
      &ldquo;{text}&rdquo;
    </p>
  );
}
