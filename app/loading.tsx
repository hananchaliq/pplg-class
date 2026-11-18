import { UnoLogo } from "@/components/ui/uno-logo";
import { SITE_CONTENT } from "@/lib/content";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Menyiapkan halaman kenangan..."
      className="flex min-h-[70vh] w-full items-center justify-center px-4 py-12"
    >
      <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <UnoLogo size="sm" />
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          UNO · {SITE_CONTENT.school.className} · {SITE_CONTENT.school.shortSchool}
        </p>
        <p className="mt-1.5 font-serif text-base font-medium text-foreground">
          Menyiapkan ruang kenangan…
        </p>
      </div>
    </div>
  );
}
