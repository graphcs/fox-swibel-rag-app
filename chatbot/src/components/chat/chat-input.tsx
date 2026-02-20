"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isStreaming || disabled) return;
    onSend(input);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isStreaming, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  return (
    <div className="border-t border-zinc-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your legal documents..."
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-4 py-3",
            "text-sm text-zinc-900 placeholder:text-zinc-400",
            "focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "max-h-[200px]"
          )}
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
              "bg-red-600 text-white transition-colors hover:bg-red-700"
            )}
            aria-label="Stop generation"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
              "bg-zinc-900 text-white transition-colors hover:bg-zinc-800",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
