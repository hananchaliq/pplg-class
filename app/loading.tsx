export default function Loading() {
  return (
    <div
      data-route-loading="true"
      aria-busy="true"
      aria-label="Memuat halaman..."
      className="relative flex min-h-[82dvh] w-full flex-col items-center justify-center overflow-hidden bg-background px-4 text-foreground"
      style={{
        backgroundImage:
          "radial-gradient(circle, color-mix(in srgb, var(--foreground) 22%, transparent) 1.35px, transparent 1.35px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="relative z-10 flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-background/90 px-7 py-5 text-center shadow-sm">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-foreground animate-pulse" />
          <span>UNO · XII PPLG 1</span>
          <span className="inline-block size-1.5 rounded-full bg-foreground animate-pulse" />
        </div>

        <div className="flex items-center gap-2 pt-0.5" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-foreground/75 animate-bounce [animation-delay:0ms] [animation-duration:1.1s]" />
          <span className="size-1.5 rounded-full bg-foreground/75 animate-bounce [animation-delay:180ms] [animation-duration:1.1s]" />
          <span className="size-1.5 rounded-full bg-foreground/75 animate-bounce [animation-delay:360ms] [animation-duration:1.1s]" />
        </div>

        <p className="font-mono text-[11px] tracking-wider text-muted-foreground">
          Menyiapkan lembaran...
        </p>
      </div>
    </div>
  );
}
