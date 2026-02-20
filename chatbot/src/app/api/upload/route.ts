import { NextResponse } from "next/server";
import { after } from "next/server";
import { insertDocument } from "@/lib/supabase/queries";
import { ingestDocument } from "@/lib/ingestion/pipeline";
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
} from "@/lib/utils/constants";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension as "pdf" | "docx")) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and DOCX files are supported." },
        { status: 400 }
      );
    }

    const fileType = extension as "pdf" | "docx";

    // Insert document record with 'processing' status
    const documentId = await insertDocument({
      filename: file.name,
      fileType,
      fileSize: file.size,
    });

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Kick off background processing using Next.js after() API
    after(async () => {
      await ingestDocument(documentId, buffer, fileType);
    });

    // Return immediately with 202 Accepted
    return NextResponse.json(
      {
        documentId,
        filename: file.name,
        status: "processing" as const,
        message: "Document uploaded successfully. Processing in background.",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
