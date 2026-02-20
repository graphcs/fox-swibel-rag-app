import { NextResponse } from "next/server";
import { z } from "zod";
import { executeRagPipeline } from "@/lib/rag/pipeline";

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1),
    })
  ).min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid request: ${parsed.error.issues[0].message}` },
        { status: 400 }
      );
    }

    const { messages } = parsed.data;

    // Execute agentic RAG pipeline
    const { sources, stream, toolCalls } = await executeRagPipeline(messages);

    // Create SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Emit tool call events (so frontend can show "Searching...")
          for (const tc of toolCalls) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "tool_call",
                  toolName: tc.toolName,
                  toolArgs: tc.args,
                })}\n\n`
              )
            );
          }

          // Emit sources
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "sources", sources })}\n\n`
            )
          );

          // Stream text deltas
          for await (const delta of stream) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text_delta", content: delta })}\n\n`
              )
            );
          }

          // Signal completion
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
