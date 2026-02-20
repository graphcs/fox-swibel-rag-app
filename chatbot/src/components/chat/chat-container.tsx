"use client";

import Link from "next/link";
import { useChat } from "@/hooks/use-chat";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { Trash2 } from "lucide-react";

export function ChatContainer() {
  const { messages, isStreaming, sendMessage, stopStreaming, clearMessages } =
    useChat();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900">
              Jannet
            </h1>
            <p className="text-xs text-zinc-500">Fox & Swibel Legal Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              disabled={isStreaming}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
          <Link
            href="/admin"
            className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Messages */}
      <MessageList messages={messages} isStreaming={isStreaming} />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
      />
    </div>
  );
}
