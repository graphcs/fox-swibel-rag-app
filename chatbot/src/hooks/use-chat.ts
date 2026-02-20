"use client";

import { useState, useCallback, useRef } from "react";
import type { Message, StreamEvent } from "@/types/chat";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
    };

    // Create placeholder assistant message
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      sources: [],
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Build conversation history for the API
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || `Request failed with status ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          try {
            const event: StreamEvent = JSON.parse(data);

            switch (event.type) {
              case "tool_call":
                setMessages((prev) =>
                  prev.map((msg, idx) =>
                    idx === prev.length - 1 && msg.role === "assistant"
                      ? { ...msg, isSearching: true }
                      : msg
                  )
                );
                break;

              case "sources":
                setMessages((prev) =>
                  prev.map((msg, idx) =>
                    idx === prev.length - 1 && msg.role === "assistant"
                      ? { ...msg, sources: event.sources, isSearching: false }
                      : msg
                  )
                );
                break;

              case "text_delta":
                setMessages((prev) =>
                  prev.map((msg, idx) =>
                    idx === prev.length - 1 &&
                    msg.role === "assistant" &&
                    event.content
                      ? { ...msg, content: msg.content + event.content }
                      : msg
                  )
                );
                break;

              case "error":
                setMessages((prev) =>
                  prev.map((msg, idx) =>
                    idx === prev.length - 1 && msg.role === "assistant"
                      ? {
                          ...msg,
                          content: `An error occurred: ${event.message || "Unknown error"}`,
                        }
                      : msg
                  )
                );
                break;

              case "done":
                break;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;

      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === prev.length - 1 && msg.role === "assistant"
            ? {
                ...msg,
                content: `An error occurred: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [messages, isStreaming]);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}
