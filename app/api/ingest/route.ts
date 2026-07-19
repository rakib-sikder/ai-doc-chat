import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { chunkText } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";
import { addChunks, createSession, sessionInfo } from "@/lib/store";
import { extractPdfText } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return extractPdfText(buffer);
  }
  return buffer.toString("utf-8");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    let sessionId = formData.get("sessionId") as string | null;

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    if (!sessionId) {
      sessionId = await createSession();
    }

    for (const file of files) {
      const text = await extractText(file);
      const pieces = chunkText(text);
      if (pieces.length === 0) continue;

      const embeddings = await embedTexts(pieces);
      const chunks = pieces.map((text, i) => ({
        id: randomUUID(),
        text,
        embedding: embeddings[i],
        source: file.name,
      }));
      await addChunks(sessionId, chunks);
    }

    const info = await sessionInfo(sessionId);
    return NextResponse.json({ sessionId, ...info });
  } catch (err) {
    console.error("Ingest error:", err);
    const message = err instanceof Error ? err.message : "Failed to process document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
