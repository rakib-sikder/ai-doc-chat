"use client";

import { useRef } from "react";
import { ArrowUp } from "lucide-react";
import { animate } from "animejs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatComposerProps {
  input: string;
  disabled: boolean;
  sendDisabled: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function ChatComposer({
  input,
  disabled,
  sendDisabled,
  placeholder,
  onChange,
  onSubmit,
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
        <Input
          value={input}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 rounded-full h-10 px-4"
        />
        <Button
          ref={buttonRef}
          type="submit"
          disabled={sendDisabled}
          size="icon"
          className="rounded-full h-10 w-10 shrink-0"
        >
          <ArrowUp className="size-4" />
        </Button>
      </form>
    </div>
  );
}
