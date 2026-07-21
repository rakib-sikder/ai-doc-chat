import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { embedText } from "@/lib/embeddings";
import { search } from "@/lib/store";

const MODEL = "gemini-3.1-flash-lite";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const { sessionId, message, history } = (await req.json()) as {
    sessionId?: string;
    message?: string;
    history?: ChatMessage[];
  };

  if (!sessionId || !message) {
    return new Response(JSON.stringify({ error: "sessionId and message are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
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

  let matches;
  try {
    const queryEmbedding = await embedText(message);
    matches = await search(sessionId, queryEmbedding, 4);
  } catch {
    return new Response(
      JSON.stringify({ error: "No documents found for this session. Upload a file first." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

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
