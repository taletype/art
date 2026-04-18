export function SkeletonCard() {
  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.03]">
      <div className="aspect-[4/3] w-full bg-white/5 animate-pulse" />
      <div className="space-y-5 p-5">
        <div className="space-y-2">
          <div className="h-4 w-20 rounded-full bg-white/10 animate-pulse" />
          <div className="h-8 w-3/4 rounded-lg bg-white/10 animate-pulse" />
        </div>
        <div className="h-16 w-full rounded-lg bg-white/5 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
        </div>
        <div className="h-12 w-full rounded-full bg-white/5 animate-pulse" />
      </div>
    </article>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-full bg-white/10 animate-pulse"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="h-4 w-24 rounded-full bg-white/10 animate-pulse" />
          <div className="mt-2 h-8 w-16 rounded-lg bg-white/10 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
