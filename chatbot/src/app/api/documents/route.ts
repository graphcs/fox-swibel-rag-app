import { NextRequest, NextResponse } from "next/server";
import { listDocuments, deleteDocument } from "@/lib/supabase/queries";

export async function GET() {
  try {
    const documents = await listDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list documents" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing document ID" },
        { status: 400 }
      );
    }

    await deleteDocument(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete document" },
      { status: 500 }
    );
  }
}
