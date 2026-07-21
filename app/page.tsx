"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Cpu, FileUp, Quote, Sparkles } from "lucide-react";

import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatMessage, type Message } from "@/components/chat-message";
import { ChatComposer } from "@/components/chat-composer";
import { AmbientBackground } from "@/components/ambient-background";
import type { StoredChunk } from "@/lib/store";

const steps = [
  {
    icon: FileUp,
    title: "Upload",
    body: "Drop a PDF or text file — it's split into overlapping chunks.",
  },
  {
    icon: Cpu,
    title: "Embedded locally",
    body: "Chunks are embedded on the server with a local model — no per-chunk API cost.",
  },
  {
    icon: Quote,
    title: "Grounded answers",
    body: "Every answer is constrained to retrieved chunks, with source citations.",
  },
];

const suggestions = [
  "Summarize this document in a few sentences.",
  "What are the key takeaways?",
  "Are there any important dates, numbers, or names?",
];

export default function Home() {
  // The browser holds the embedded chunks and sends them with each question —
  // serverless instances share no filesystem, so the server keeps no session state.
  const [chunks, setChunks] = useState<StoredChunk[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    chunks.forEach((c) => counts.set(c.source, (counts.get(c.source) ?? 0) + 1));
    return Array.from(counts, ([name, count]) => ({ name, count }));
  }, [chunks]);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from("[data-reveal='logo']", { opacity: 0, scale: 0.5, duration: 0.5, ease: "back.out(2.2)" })
        .from("[data-reveal='title']", { opacity: 0, x: -10, duration: 0.4 }, "<0.05")
        .from("[data-reveal='sidebar-text']", { opacity: 0, y: 8, duration: 0.45 }, "-=0.2")
        .from("[data-reveal='dropzone']", { opacity: 0, y: 16, scale: 0.97, duration: 0.5 }, "-=0.25")
        .from("[data-reveal='sidebar-footer']", { opacity: 0, y: 8, duration: 0.4 }, "-=0.2")
        .from("[data-reveal='empty-state']", { opacity: 0, y: 10, duration: 0.5 }, "-=0.35")
        .from("[data-reveal='composer']", { opacity: 0, y: 16, duration: 0.5 }, "-=0.4");
    },
    { scope: rootRef }
  );

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" });
  }, [messages]);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    Array.from(fileList).forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/ingest", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setChunks((prev) => [...prev, ...(data.chunks ?? [])]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const removeSource = useCallback((name: string) => {
    setChunks((prev) => prev.filter((c) => c.source !== name));
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    async (text?: string) => {
      const question = (text ?? input).trim();
      if (!question || chunks.length === 0 || isStreaming) return;

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: "" }]);
      setInput("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question, history, chunks }),
          signal: controller.signal,
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
      } catch (err) {
        // Abort = the user pressed stop; keep whatever streamed so far.
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: "⚠️ Network error — please try again." };
            return next;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [input, chunks, isStreaming, messages]
  );

  const hasDocs = chunks.length > 0;

  return (
    <div ref={rootRef} className="relative flex h-full min-h-screen text-foreground">
      <AmbientBackground />

      <ChatSidebar
        uploading={uploading}
        uploadError={uploadError}
        dragActive={dragActive}
        sources={sources}
        fileInputRef={fileInputRef}
        onDragActiveChange={setDragActive}
        onFiles={handleFiles}
        onRemoveSource={removeSource}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !hasDocs && (
            <div
              data-reveal="empty-state"
              className="h-full flex flex-col items-center justify-center gap-8 px-4"
            >
              <div className="text-center space-y-3">
                <h2 className="font-serif text-4xl sm:text-5xl tracking-tight [text-wrap:balance]">
                  Ask your documents <em className="italic text-primary">anything.</em>
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Upload a PDF or text file and get answers grounded strictly in its content —
                  nothing invented, every claim cited.
                </p>
              </div>
              <ol className="grid gap-3 sm:grid-cols-3 w-full max-w-2xl">
                {steps.map((s) => (
                  <li
                    key={s.title}
                    className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 text-left"
                  >
                    <s.icon className="size-4 text-primary mb-2" aria-hidden />
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {messages.length === 0 && hasDocs && (
            <div className="h-full flex flex-col items-center justify-center gap-6 px-4">
              <div className="text-center space-y-2">
                <h2 className="font-serif text-3xl sm:text-4xl tracking-tight">
                  Your documents are <em className="italic text-primary">ready.</em>
                </h2>
                <p className="text-sm text-muted-foreground">Try one of these to get going:</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="group flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <Sparkles className="size-3.5 text-primary opacity-70 group-hover:opacity-100" aria-hidden />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
          <div ref={bottomRef} />
        </div>

        <div data-reveal="composer" className="bg-background/70 backdrop-blur-xl">
          <ChatComposer
            input={input}
            disabled={!hasDocs || isStreaming}
            sendDisabled={!hasDocs || isStreaming || !input.trim()}
            isStreaming={isStreaming}
            hasMessages={messages.length > 0}
            placeholder={hasDocs ? "Ask a question about your document…" : "Upload a document first…"}
            onChange={setInput}
            onSubmit={() => sendMessage()}
            onStop={stopStreaming}
            onClear={clearChat}
          />
        </div>
      </main>
    </div>
  );
}
