"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

export function ThinkingDots() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const dots = ref.current.children;
    const animation = animate(dots, {
      translateY: [0, -5, 0],
      opacity: [0.35, 1, 0.35],
      duration: 900,
      delay: stagger(140),
      loop: true,
      ease: "inOutSine",
    });
    return () => {
      animation.revert();
    };
  }, []);

  return (
    <div ref={ref} className="flex items-center gap-1 py-1">
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
    </div>
  );
}
