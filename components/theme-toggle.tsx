"use client";

import { useRef } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { animate } from "animejs";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const iconRef = useRef<HTMLSpanElement>(null);

  const toggle = () => {
    if (iconRef.current) {
      animate(iconRef.current, {
        rotate: [0, 180],
        scale: [1, 0.6, 1],
        duration: 420,
        ease: "inOutQuad",
      });
    }
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggle}
      className="rounded-full"
    >
      <span ref={iconRef} className="inline-flex">
        <Sun className="size-4 scale-100 dark:scale-0 transition-transform absolute" />
        <Moon className="size-4 scale-0 dark:scale-100 transition-transform" />
      </span>
    </Button>
  );
}
