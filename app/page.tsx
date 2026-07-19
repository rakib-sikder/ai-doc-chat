"use client";

import { useCallback, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      Array.from(fileList).forEach((f) => formData.append("files", f));
      if (sessionId) formData.append("sessionId", sessionId);

      try {
        const res = await fetch("/api/ingest", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        setSessionId(data.sessionId);
        setSources(data.sources ?? []);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [sessionId]
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !sessionId || isStreaming) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text, history }),
      });

      const sourcesHeader = res.headers.get("X-Sources");
      const usedSources: string[] = sourcesHeader ? JSON.parse(decodeURIComponent(sourcesHeader)) : [];

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: `⚠️ ${data.error ?? "Something went wrong"}` };
          return next;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc, sources: usedSources };
          return next;
        });
      }
    } finally {
      setIsStreaming(false);
    }
  }, [input, sessionId, isStreaming, messages]);

  return (
    <div className="flex h-full min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <aside className="w-80 shrink-0 border-r border-neutral-200 dark:border-neutral-800 p-5 flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">DocChat</h1>
          <p className="text-sm text-neutral-500">RAG-powered document Q&A — runs local embeddings, answers only from your files.</p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400"
          }`}
        >
          {uploading ? "Processing…" : "Drop a PDF or .txt file here, or click to browse"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

        {sources.length > 0 && (
          <div>
            <h2 className="text-xs font-medium uppercase text-neutral-500 mb-2">Loaded documents</h2>
            <ul className="space-y-1 text-sm">
              {sources.map((s) => (
                <li key={s} className="truncate rounded bg-neutral-100 dark:bg-neutral-900 px-2 py-1">
                  📄 {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto text-xs text-neutral-400">
          Embeddings run locally (Xenova/all-MiniLM-L6-v2). Answers generated by Claude, grounded strictly in retrieved chunks.
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
              {sessionId ? "Ask a question about your document." : "Upload a document to get started."}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 text-xs text-neutral-400">
                    {m.sources.map((s, idx) => (
                      <span key={idx} className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5">
                        [{idx + 1}] {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!sessionId || isStreaming}
              placeholder={sessionId ? "Ask a question about your document…" : "Upload a document first…"}
              className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2 text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!sessionId || isStreaming || !input.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
