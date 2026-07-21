import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { chunkText } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";
import type { StoredChunk } from "@/lib/store";
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

// Embeddings are normalized unit vectors; 6 decimals is far more precision than
// cosine ranking needs and roughly halves the JSON payload the client holds.
function compact(embedding: number[]): number[] {
  return embedding.map((v) => Math.round(v * 1e6) / 1e6);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const chunks: StoredChunk[] = [];
    for (const file of files) {
      const text = await extractText(file);
      const pieces = chunkText(text);
      if (pieces.length === 0) continue;

      const embeddings = await embedTexts(pieces);
      pieces.forEach((text, i) => {
        chunks.push({ id: randomUUID(), text, embedding: compact(embeddings[i]), source: file.name });
      });
    }

    // The client keeps these and sends them back with each question — the server
    // stores nothing, so it works regardless of which serverless instance answers.
    return NextResponse.json({
      chunks,
      chunkCount: chunks.length,
      sources: Array.from(new Set(chunks.map((c) => c.source))),
    });
  } catch (err) {
    console.error("Ingest error:", err);
    const message = err instanceof Error ? err.message : "Failed to process document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
