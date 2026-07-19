import { MessageSquareText } from "lucide-react";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  const gradient = "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), black 30%))";

  return (
    <div data-reveal="logo" className={`relative shrink-0 ${className}`}>
      <div
        className="absolute inset-0 rounded-xl blur-lg opacity-60 animate-pulse"
        style={{ backgroundImage: gradient }}
      />
      <div
        className="relative h-full w-full rounded-xl flex items-center justify-center ring-1 ring-white/15"
        style={{
          backgroundImage: gradient,
          boxShadow: "0 6px 16px -4px color-mix(in oklch, var(--primary), transparent 55%)",
        }}
      >
        <MessageSquareText className="size-4.5 text-primary-foreground" strokeWidth={2.25} />
      </div>
    </div>
  );
}
