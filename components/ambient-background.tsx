export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-primary/25 blur-[120px] animate-[drift-a_18s_ease-in-out_infinite]" />
      <div className="absolute top-1/3 -right-32 size-[24rem] rounded-full bg-blue-400/20 dark:bg-blue-500/15 blur-[120px] animate-[drift-b_22s_ease-in-out_infinite]" />
      <div className="absolute bottom-0 left-1/3 size-[20rem] rounded-full bg-indigo-300/20 dark:bg-indigo-500/10 blur-[110px] animate-[drift-a_26s_ease-in-out_infinite_reverse]" />
    </div>
  );
}
