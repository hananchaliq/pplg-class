export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Memuat halaman..."
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6"
    >
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto h-3.5 w-44 animate-pulse rounded-full bg-muted" />
        <div className="mx-auto mt-3 h-9 w-80 max-w-full animate-pulse rounded-xl bg-muted" />
        <div className="mx-auto mt-3 h-4 w-96 max-w-full animate-pulse rounded-lg bg-muted/70" />
      </div>
      <div className="mt-10 h-[360px] w-full animate-pulse rounded-2xl border border-border bg-card/60" />
    </div>
  );
}
