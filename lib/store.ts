import { cosineSimilarity } from "./embeddings";

export interface StoredChunk {
  id: string;
  text: string;
  embedding: number[];
  source: string;
}

// Sessions are held client-side (the browser keeps the embedded chunks and sends
// them with each question). Serverless instances share no filesystem, so any
// server-side session store here would randomly "lose" sessions whenever the
// chat request landed on a different instance than the upload.
export function topKChunks(
  chunks: StoredChunk[],
  queryEmbedding: number[],
  topK = 4
): { text: string; source: string; score: number }[] {
  return chunks
    .map((chunk) => ({
      text: chunk.text,
      source: chunk.source,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
