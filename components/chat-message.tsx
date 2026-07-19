import ReactMarkdown from "react-markdown";

import { cn } from "@/lib/utils";

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-2xl rounded-2xl px-4 py-3 text-sm shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border"
        )}
      >
        <div
          className={cn(
            "prose prose-sm max-w-none",
            isUser ? "prose-invert" : "dark:prose-invert"
          )}
        >
          <ReactMarkdown>{message.content || "…"}</ReactMarkdown>
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
            {message.sources.map((s, idx) => (
              <span key={idx} className="rounded-full bg-muted px-2 py-0.5">
                [{idx + 1}] {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
