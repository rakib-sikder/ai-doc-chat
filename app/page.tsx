"use client";

import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MessageCircle } from "lucide-react";

import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatMessage, type Message } from "@/components/chat-message";
import { ChatComposer } from "@/components/chat-composer";
import { AmbientBackground } from "@/components/ambient-background";
import type { StoredChunk } from "@/lib/store";

export default function Home() {
  // The browser holds the embedded chunks and sends them with each question —
  // serverless instances share no filesystem, so the server keeps no session state.
  const [chunks, setChunks] = useState<StoredChunk[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      Array.from(fileList).forEach((f) => formData.append("files", f));

      try {
        const res = await fetch("/api/ingest", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        setChunks((prev) => {
          const next = [...prev, ...(data.chunks ?? [])];
          setSources(Array.from(new Set(next.map((c) => c.source))));
          return next;
        });
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || chunks.length === 0 || isStreaming) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, chunks }),
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
  }, [input, chunks, isStreaming, messages]);

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
      />

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div
              data-reveal="empty-state"
              className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_0_0_8px_var(--accent)] animate-pulse">
                <MessageCircle className="size-5" />
              </div>
              <p className="text-sm">
                {chunks.length > 0 ? "Ask a question about your document." : "Upload a document to get started."}
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
        </div>

        <div data-reveal="composer" className="bg-background/70 backdrop-blur-xl">
          <ChatComposer
            input={input}
            disabled={chunks.length === 0 || isStreaming}
            sendDisabled={chunks.length === 0 || isStreaming || !input.trim()}
            placeholder={chunks.length > 0 ? "Ask a question about your document…" : "Upload a document first…"}
            onChange={setInput}
            onSubmit={sendMessage}
          />
        </div>
      </main>
    </div>
  );
}
