import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { cosineSimilarity } from "./embeddings";

export interface StoredChunk {
  id: string;
  text: string;
  embedding: number[];
  source: string;
}

interface SessionData {
  sessionId: string;
  createdAt: string;
  chunks: StoredChunk[];
}

// Serverless platforms (Vercel, Lambda) only allow writes under the OS temp dir —
// the project directory itself is read-only at runtime. Sessions are therefore
// ephemeral per warm instance; swap for a real DB before relying on this in production.
const DATA_DIR = path.join(os.tmpdir(), "ai-doc-chat-sessions");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function sessionPath(sessionId: string): string {
  // sessionId is always a server-generated UUID, but sanitize defensively anyway.
  const safe = sessionId.replace(/[^a-zA-Z0-9-]/g, "");
  return path.join(DATA_DIR, `${safe}.json`);
}

export async function createSession(): Promise<string> {
  await ensureDir();
  const sessionId = crypto.randomUUID();
  const data: SessionData = { sessionId, createdAt: new Date().toISOString(), chunks: [] };
  await fs.writeFile(sessionPath(sessionId), JSON.stringify(data), "utf-8");
  return sessionId;
}

export async function addChunks(sessionId: string, chunks: StoredChunk[]): Promise<void> {
  const data = await loadSession(sessionId);
  data.chunks.push(...chunks);
  await fs.writeFile(sessionPath(sessionId), JSON.stringify(data), "utf-8");
}

async function loadSession(sessionId: string): Promise<SessionData> {
  try {
    const raw = await fs.readFile(sessionPath(sessionId), "utf-8");
    return JSON.parse(raw) as SessionData;
  } catch {
    throw new Error("Session not found. Upload a document first.");
  }
}

export async function sessionInfo(sessionId: string): Promise<{ chunkCount: number; sources: string[] }> {
  const data = await loadSession(sessionId);
  return {
    chunkCount: data.chunks.length,
    sources: Array.from(new Set(data.chunks.map((c) => c.source))),
  };
}

export async function search(
  sessionId: string,
  queryEmbedding: number[],
  topK = 4
): Promise<{ text: string; source: string; score: number }[]> {
  const data = await loadSession(sessionId);
  return data.chunks
    .map((chunk) => ({
      text: chunk.text,
      source: chunk.source,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
