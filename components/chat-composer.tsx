"use client";

import { useRef } from "react";
import { ArrowUp, Eraser, Square } from "lucide-react";
import { animate } from "animejs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatComposerProps {
  input: string;
  disabled: boolean;
  sendDisabled: boolean;
  isStreaming: boolean;
  hasMessages: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onClear: () => void;
}

export function ChatComposer({
  input,
  disabled,
  sendDisabled,
  isStreaming,
  hasMessages,
  placeholder,
  onChange,
  onSubmit,
  onStop,
  onClear,
}: ChatComposerProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (buttonRef.current) {
      animate(buttonRef.current, {
        scale: [1, 0.85, 1],
        duration: 260,
        ease: "outQuad",
      });
    }
    onSubmit();
  };

  return (
    <div className="border-t border-border p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        {hasMessages && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onClear}
                  aria-label="Clear conversation"
                  className="rounded-full h-10 w-10 shrink-0"
                >
                  <Eraser className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Clear conversation</TooltipContent>
          </Tooltip>
        )}
        <Input
          value={input}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 rounded-full h-10 px-4"
        />
        {isStreaming ? (
          <Button
            type="button"
            onClick={onStop}
            variant="outline"
            size="icon"
            aria-label="Stop generating"
            className="rounded-full h-10 w-10 shrink-0"
          >
            <Square className="size-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            ref={buttonRef}
            type="submit"
            disabled={sendDisabled}
            size="icon"
            aria-label="Send"
            className="rounded-full h-10 w-10 shrink-0"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
