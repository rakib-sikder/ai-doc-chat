"use client";

import { useRef, type RefObject } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { animate, stagger } from "animejs";

import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

export interface SourceInfo {
  name: string;
  count: number;
}

interface ChatSidebarProps {
  uploading: boolean;
  uploadError: string | null;
  dragActive: boolean;
  sources: SourceInfo[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDragActiveChange: (active: boolean) => void;
  onFiles: (files: FileList | null) => void;
  onRemoveSource: (name: string) => void;
}

export function ChatSidebar({
  uploading,
  uploadError,
  dragActive,
  sources,
  fileInputRef,
  onDragActiveChange,
  onFiles,
  onRemoveSource,
}: ChatSidebarProps) {
  const pillsRef = useRef<HTMLUListElement>(null);
  const prevCount = useRef(0);

  if (sources.length > prevCount.current && pillsRef.current) {
    const added = Array.from(pillsRef.current.children).slice(prevCount.current);
    if (added.length) {
      animate(added, {
        opacity: [0, 1],
        scale: [0.85, 1],
        duration: 380,
        delay: stagger(60),
        ease: "outBack",
      });
    }
  }
  prevCount.current = sources.length;

  const totalChunks = sources.reduce((sum, s) => sum + s.count, 0);

  return (
    <aside className="relative w-80 shrink-0 border-r border-border bg-sidebar/70 backdrop-blur-xl p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <h1 data-reveal="title" className="font-serif text-xl font-medium tracking-tight">
            DocChat
          </h1>
        </div>
        <ThemeToggle />
      </div>
      <p data-reveal="sidebar-text" className="text-sm text-muted-foreground -mt-4">
        RAG-powered document Q&amp;A — runs local embeddings, answers only from your files.
      </p>

      <div
        data-reveal="dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          onDragActiveChange(true);
        }}
        onDragLeave={() => onDragActiveChange(false)}
        onDrop={(e) => {
          e.preventDefault();
          onDragActiveChange(false);
          onFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "group cursor-pointer rounded-xl border-2 border-dashed p-7 text-center text-sm transition-colors duration-200 hover:shadow-md",
          dragActive ? "border-primary bg-accent shadow-md" : "border-border hover:border-primary/50 hover:bg-accent/40"
        )}
      >
        {uploading ? (
          <Loader2 className="mx-auto mb-2 size-6 animate-spin text-primary" />
        ) : (
          <FileText className="mx-auto mb-2 size-6 text-muted-foreground transition-transform duration-200 group-hover:scale-110" />
        )}
        {uploading ? "Processing…" : "Drop a PDF or .txt file, or click to browse"}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      {sources.length > 0 && (
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2.5">
            Loaded documents
          </h2>
          <ul ref={pillsRef} className="flex flex-col gap-1.5 text-sm">
            {sources.map((s) => (
              <li
                key={s.name}
                className="group flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-1.5"
              >
                <FileText className="size-3.5 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {s.count} {s.count === 1 ? "chunk" : "chunks"}
                </span>
                <button
                  onClick={() => onRemoveSource(s.name)}
                  aria-label={`Remove ${s.name}`}
                  className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div data-reveal="sidebar-footer" className="mt-auto space-y-2 text-xs text-muted-foreground leading-relaxed">
        {totalChunks > 0 && (
          <p className="font-mono">
            {totalChunks} chunks · {sources.length} {sources.length === 1 ? "document" : "documents"} in memory
          </p>
        )}
        <p>
          Embeddings run locally (Xenova/all-MiniLM-L6-v2). Answers generated by Gemini, grounded
          strictly in retrieved chunks.
        </p>
      </div>
    </aside>
  );
}
