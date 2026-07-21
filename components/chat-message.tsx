"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { ThinkingDots } from "@/components/thinking-dots";

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isPending = !isUser && message.content === "";
  const [copied, setCopied] = useState(false);

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard can be blocked by the browser; fail silently
    }
  }

  return (
    <div
      className={cn(
        "group/message flex animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-2xl rounded-2xl px-4 py-3 text-sm shadow-sm transition-shadow hover:shadow-md",
          isUser ? "bg-primary text-primary-foreground" : "bg-card border border-border"
        )}
      >
        {isPending ? (
          <ThinkingDots />
        ) : (
          <div
            className={cn(
              "prose prose-sm max-w-none",
              isUser ? "prose-invert" : "dark:prose-invert"
            )}
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
            {message.sources.map((s, idx) => (
              <span key={idx} className="rounded-full bg-muted px-2 py-0.5">
                [{idx + 1}] {s}
              </span>
            ))}
          </div>
        )}
        {!isUser && !isPending && (
          <button
            onClick={copyContent}
            aria-label="Copy answer"
            className="absolute -right-2 -top-2 rounded-full border border-border bg-background p-1.5 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/message:opacity-100"
          >
            {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
          </button>
        )}
      </div>
    </div>
  );
}
