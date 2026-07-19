# DocChat — RAG Document Q&A

Upload a PDF or text file and ask questions about it. Answers are grounded strictly in the
document's content, with inline source citations — no hallucinated answers outside the
uploaded material.

## How it works

1. **Ingest** (`/api/ingest`) — extracts text from the uploaded file(s), splits it into
   overlapping chunks, and embeds each chunk **locally** using `Xenova/all-MiniLM-L6-v2`
   via `@huggingface/transformers` (no external embedding API, no per-chunk cost).
2. **Store** — chunk embeddings are persisted per-session as JSON under `.data/sessions/`
   (swap this for a real vector DB like pgvector/Pinecone/Qdrant for production scale).
3. **Chat** (`/api/chat`) — embeds the question, retrieves the top-k most similar chunks
   via cosine similarity, and streams a Claude-generated answer constrained to that
   retrieved context, with source attribution.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · `@huggingface/transformers`
(local embeddings) · `@anthropic-ai/sdk` (generation, streamed) · `pdf-parse`

## Getting started

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload a PDF or `.txt` file, and start asking questions.

> The first request downloads the local embedding model (~90MB) and caches it — expect a
> short delay on first upload only.

## Notes for production use

- Session data and the embedding model cache are stored under the OS temp dir so this
  runs on serverless platforms (Vercel, Lambda) whose project directory is read-only —
  but that also means sessions are ephemeral per warm instance and the ~90MB model may
  re-download on cold starts. Swap `lib/store.ts` for a real vector database (pgvector/
  Pinecone/Qdrant) and consider a persistent server (Railway/Render/Fly) if you need
  durable sessions or consistently fast cold starts.
- Add auth + per-user session scoping before exposing this publicly.
- `maxDuration` is set to 60s on both API routes for larger documents — adjust for your
  hosting platform's limits.
