import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { embedText } from "@/lib/embeddings";
import { topKChunks, type StoredChunk } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "gemini-3.1-flash-lite";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const { message, history, chunks } = (await req.json()) as {
    message?: string;
    history?: ChatMessage[];
    chunks?: StoredChunk[];
  };

  if (!message) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(chunks) || chunks.length === 0) {
    return new Response(
      JSON.stringify({ error: "No document chunks provided. Upload a file first." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "GEMINI_API_KEY is not configured on the server. Add it to .env.local and restart the dev server.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const queryEmbedding = await embedText(message);
  const matches = topKChunks(chunks, queryEmbedding, 4);

  const context = matches
    .map((m, i) => `[Source ${i + 1}: ${m.source}]\n${m.text}`)
    .join("\n\n---\n\n");

  const systemPrompt = `You are a helpful assistant that answers questions strictly using the provided document excerpts.
Cite sources inline like [Source 1] when you use them. If the answer isn't in the excerpts, say you don't know — do not make things up.

Document excerpts:
${context}`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const contents = [
    ...(history ?? []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const geminiStream = await ai.models.generateContentStream({
          model: MODEL,
          contents,
          config: { systemInstruction: systemPrompt, maxOutputTokens: 1024 },
        });

        for await (const chunk of geminiStream) {
          if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
        }

        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error while generating a response";
        controller.enqueue(encoder.encode(`\n\n[Error: ${message}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Sources": encodeURIComponent(JSON.stringify(matches.map((m) => m.source))),
    },
  });
}
