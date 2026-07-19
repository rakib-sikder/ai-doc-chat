"use client";

import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MessageCircle } from "lucide-react";

import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatMessage, type Message } from "@/components/chat-message";
import { ChatComposer } from "@/components/chat-composer";

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
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-reveal]", {
        opacity: 0,
        y: 14,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
      });
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
    <div ref={rootRef} className="flex h-full min-h-screen bg-background text-foreground">
      <div data-reveal>
        <ChatSidebar
          uploading={uploading}
          uploadError={uploadError}
          dragActive={dragActive}
          sources={sources}
          fileInputRef={fileInputRef}
          onDragActiveChange={setDragActive}
          onFiles={handleFiles}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div
              data-reveal
              className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <MessageCircle className="size-5" />
              </div>
              <p className="text-sm">
                {sessionId ? "Ask a question about your document." : "Upload a document to get started."}
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
        </div>

        <div data-reveal>
          <ChatComposer
            input={input}
            disabled={!sessionId || isStreaming}
            sendDisabled={!sessionId || isStreaming || !input.trim()}
            placeholder={sessionId ? "Ask a question about your document…" : "Upload a document first…"}
            onChange={setInput}
            onSubmit={sendMessage}
          />
        </div>
      </main>
    </div>
  );
}
