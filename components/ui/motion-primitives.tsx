"use client";

import * as React from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { X } from "lucide-react";
import {
  MOTION_DISTANCE,
  MOTION_DURATION,
  MOTION_EASE,
  MOTION_STAGGER,
  isFinePointerDevice,
  prefersReducedMotion,
} from "@/lib/motion-tokens";

/**
 * Tombol editorial dengan sapuan isi halus, umpan balik tekan pegas,
 * dan efek magnetik ultra-tipis khusus pointer desktop.
 */
interface EditorialButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  magnetic?: boolean;
}

export function EditorialButton({
  variant = "primary",
  magnetic = true,
  className = "",
  children,
  onMouseMove,
  onMouseLeave,
  disabled,
  ...rest
}: EditorialButtonProps) {
  const ref = React.useRef<HTMLButtonElement | null>(null);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseMove?.(e);
    if (!magnetic || disabled || !isFinePointerDevice() || prefersReducedMotion()) {
      return;
    }
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const ry = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setOffset({
      x: Math.max(-1, Math.min(1, rx)) * MOTION_DISTANCE.magneticMaxPx,
      y: Math.max(-1, Math.min(1, ry)) * MOTION_DISTANCE.magneticMaxPx,
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseLeave?.(e);
    if (offset.x !== 0 || offset.y !== 0) {
      setOffset({ x: 0, y: 0 });
    }
  };

  const baseStyles =
    variant === "primary"
      ? "bg-primary text-primary-foreground border border-primary shadow-sm"
      : variant === "secondary"
        ? "bg-card text-foreground border border-border hover:border-foreground/45"
        : "bg-transparent text-foreground border border-transparent hover:bg-muted/70";

  const sweepStyles =
    variant === "primary"
      ? "bg-foreground/12 dark:bg-background/14"
      : "bg-foreground/[0.06]";

  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      animate={{ x: offset.x, y: offset.y }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={MOTION_EASE.springTactile}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative inline-flex min-h-[42px] items-center justify-center gap-2 overflow-hidden rounded-lg px-4 py-2 font-sans text-xs sm:text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 ${baseStyles} ${className}`}
      {...(rest as Record<string, unknown>)}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-300 ease-out group-hover:translate-x-0 ${sweepStyles}`}
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

/**
 * Tautan editorial bergaya tombol dengan sapuan isi + magnetik halus.
 */
interface EditorialLinkButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: "primary" | "secondary";
  magnetic?: boolean;
}

export function EditorialLinkButton({
  variant = "primary",
  magnetic = true,
  className = "",
  children,
  onMouseMove,
  onMouseLeave,
  ...rest
}: EditorialLinkButtonProps) {
  const ref = React.useRef<HTMLAnchorElement | null>(null);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onMouseMove?.(e);
    if (!magnetic || !isFinePointerDevice() || prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const ry = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setOffset({
      x: Math.max(-1, Math.min(1, rx)) * MOTION_DISTANCE.magneticMaxPx,
      y: Math.max(-1, Math.min(1, ry)) * MOTION_DISTANCE.magneticMaxPx,
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onMouseLeave?.(e);
    if (offset.x !== 0 || offset.y !== 0) {
      setOffset({ x: 0, y: 0 });
    }
  };

  const baseStyles =
    variant === "primary"
      ? "bg-primary text-primary-foreground border border-primary shadow-sm"
      : "bg-card text-foreground border border-border hover:border-foreground/45";

  const sweepStyles =
    variant === "primary"
      ? "bg-foreground/12 dark:bg-background/14"
      : "bg-foreground/[0.06]";

  return (
    <motion.a
      ref={ref}
      animate={{ x: offset.x, y: offset.y }}
      whileTap={{ scale: 0.97 }}
      transition={MOTION_EASE.springTactile}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-lg px-4 sm:px-5 py-2.5 font-sans text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${baseStyles} ${className}`}
      {...(rest as Record<string, unknown>)}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-300 ease-out group-hover:translate-x-0 ${sweepStyles}`}
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.a>
  );
}

/**
 * Mask reveal bergaya cetakan tinta koran untuk judul utama (split per baris/frasa).
 */
export function SplitLineHeading({
  as = "h1",
  children,
  className = "",
  id,
  delay = 0,
}: {
  as?: "h1" | "h2" | "h3";
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const Tag = as;

  const text = typeof children === "string" ? children : null;
  const segments = React.useMemo(() => {
    if (!text) return null;
    return text.split("\n");
  }, [text]);

  return (
    <div ref={ref} className="overflow-hidden">
      <Tag id={id} className={className}>
        {segments ? (
          segments.map((line, idx) => (
            <span key={idx} className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: "100%", opacity: 0.001 }}
                animate={
                  inView
                    ? { y: "0%", opacity: 1 }
                    : { y: "100%", opacity: 0.001 }
                }
                transition={{
                  duration: MOTION_DURATION.slow,
                  delay: delay + idx * MOTION_STAGGER.relaxed,
                  ease: MOTION_EASE.editorial,
                }}
              >
                {line}
              </motion.span>
            </span>
          ))
        ) : (
          <motion.span
            className="block"
            initial={{ y: "100%", opacity: 0.001 }}
            animate={
              inView
                ? { y: "0%", opacity: 1 }
                : { y: "100%", opacity: 0.001 }
            }
            transition={{
              duration: MOTION_DURATION.slow,
              delay,
              ease: MOTION_EASE.editorial,
            }}
          >
            {children}
          </motion.span>
        )}
      </Tag>
    </div>
  );
}

/**
 * Garis tipis ala koran cetak yang tergambar halus dari kiri ke kanan saat masuk viewport.
 */
export function DrawnHairlineRule({ className = "" }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <div ref={ref} aria-hidden="true" className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ scaleX: 0, opacity: 0.35 }}
        animate={inView ? { scaleX: 1, opacity: 0.85 } : { scaleX: 0, opacity: 0.35 }}
        transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.editorial }}
        className="ikat-divider origin-left"
      />
    </div>
  );
}

/**
 * Kartu editorial dengan kemunculan staggered sekali jalan + tilt 3D super halus di desktop.
 */
export function TiltRevealCard({
  children,
  className = "",
  delay = 0,
  enableTilt = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  enableTilt?: boolean;
}) {
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(cardRef, { once: true, amount: 0.12 });
  const [tilt, setTilt] = React.useState({ rx: 0, ry: 0 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !isFinePointerDevice() || prefersReducedMotion()) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({
      rx: -ny * MOTION_DISTANCE.tiltMaxDeg,
      ry: nx * MOTION_DISTANCE.tiltMaxDeg,
    });
  };

  const handleLeave = () => {
    if (tilt.rx !== 0 || tilt.ry !== 0) {
      setTilt({ rx: 0, ry: 0 });
    }
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: MOTION_DISTANCE.md }}
      animate={
        inView
          ? { opacity: 1, y: 0, rotateX: tilt.rx, rotateY: tilt.ry }
          : { opacity: 0, y: MOTION_DISTANCE.md }
      }
      transition={{
        opacity: { duration: MOTION_DURATION.medium, delay, ease: MOTION_EASE.editorial },
        y: { duration: MOTION_DURATION.medium, delay, ease: MOTION_EASE.editorial },
        rotateX: { duration: 0.22, ease: "easeOut" },
        rotateY: { duration: 0.22, ease: "easeOut" },
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Reveal gambar bergaya tirai film (`clip-path`) saat masuk layar.
 */
export function ClipPathMedia({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.18 });

  return (
    <motion.div
      ref={ref}
      initial={{ clipPath: "inset(8% 0% 0% 0%)", opacity: 0.4 }}
      animate={
        inView
          ? { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }
          : { clipPath: "inset(8% 0% 0% 0%)", opacity: 0.4 }
      }
      transition={{
        duration: MOTION_DURATION.slow,
        delay,
        ease: MOTION_EASE.editorial,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Angka statistik dengan animasi count-up sekali jalan saat terlihat di viewport.
 */
export function CountUpNumber({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [display, setDisplay] = React.useState(value);
  const prevRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const startVal = prevRef.current === null ? 0 : prevRef.current;
    const durationMs = MOTION_DURATION.countUp * 1000;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(startVal + (value - startVal) * eased));
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        prevRef.current = value;
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [value, inView]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {display}
    </span>
  );
}

/**
 * Skeleton shimmer monokrom lembut untuk pemuatan konten.
 */
export function MonochromeShimmer({ className = "h-24 w-full rounded-xl" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`editorial-shimmer relative overflow-hidden bg-muted/70 ${className}`}
    />
  );
}

/**
 * Input dengan floating label halus dan indikator fokus tinta.
 */
interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

export function FloatingInput({
  label,
  id,
  value,
  className = "",
  placeholder = " ",
  ...rest
}: FloatingInputProps) {
  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        className={`peer w-full rounded-lg border border-border bg-background px-3 pt-5 pb-2 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none ${className}`}
        {...rest}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute top-2 left-3 origin-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-foreground"
      >
        {label}
      </label>
    </div>
  );
}

/**
 * Textarea dengan floating label halus.
 */
interface FloatingTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
}

export function FloatingTextarea({
  label,
  id,
  value,
  className = "",
  placeholder = " ",
  ...rest
}: FloatingTextareaProps) {
  return (
    <div className="relative">
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        className={`peer w-full rounded-lg border border-border bg-background px-3 pt-5 pb-2 text-sm leading-relaxed text-foreground transition-colors focus:border-foreground focus:outline-none ${className}`}
        {...rest}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute top-2 left-3 origin-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-foreground"
      >
        {label}
      </label>
    </div>
  );
}

/**
 * Modal / Bottom Sheet editorial dengan backdrop blur lembut, drag-to-dismiss,
 * Escape close, dan focus trap aksesibel.
 */
export function EditorialModal({
  open,
  onClose,
  title,
  ariaLabel,
  children,
  maxWidthClass = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const getFocusable = () => {
      if (!panel) return [] as HTMLElement[];
      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      );
    };

    const first = getFocusable()[0];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusables = getFocusable();
        if (focusables.length === 0) return;
        const firstEl = focusables[0]!;
        const lastEl = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOTION_DURATION.fast }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-foreground/45 backdrop-blur-[3px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: 28, scale: 0.96, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, scale: 0.97, filter: "blur(3px)" }}
            transition={MOTION_EASE.springSheet}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.45 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 420) {
                onClose();
              }
            }}
            className={`relative z-10 max-h-[86dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:rounded-2xl ${maxWidthClass}`}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
            {title && (
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                <h2 className="font-serif text-lg font-bold text-foreground">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup dialog"
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
