"use client";

import * as React from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "motion/react";
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
 * Global MotionConfig root so every Framer Motion interaction honours OS reduced-motion settings.
 */
export function MotionRootProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/**
 * Tombol editorial dengan sapuan kilau sutra, umpan balik tekan pegas,
 * dan efek magnetik zero-rerender via MotionValue + useSpring.
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
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, MOTION_EASE.springMagnetic);
  const y = useSpring(rawY, MOTION_EASE.springMagnetic);

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
    rawX.set(Math.max(-1, Math.min(1, rx)) * MOTION_DISTANCE.magneticMaxPx);
    rawY.set(Math.max(-1, Math.min(1, ry)) * MOTION_DISTANCE.magneticMaxPx);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseLeave?.(e);
    rawX.set(0);
    rawY.set(0);
  };

  const baseStyles =
    variant === "primary"
      ? "bg-primary text-primary-foreground border border-primary shadow-sm"
      : variant === "secondary"
        ? "bg-card text-foreground border border-border hover:border-foreground/45"
        : "bg-transparent text-foreground border border-transparent hover:bg-muted/70";

  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      style={{ x, y }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={MOTION_EASE.springTactile}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative inline-flex min-h-[42px] items-center justify-center gap-2 overflow-hidden rounded-lg px-4 py-2 font-sans text-xs sm:text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 ${baseStyles} ${className}`}
      {...(rest as Record<string, unknown>)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-500 ease-out group-hover:translate-x-full"
        style={{
          background:
            "linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.18) 50%, transparent 80%)",
        }}
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

/**
 * Tautan editorial bergaya tombol dengan sapuan kilau sutra + magnetik zero-rerender.
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
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, MOTION_EASE.springMagnetic);
  const y = useSpring(rawY, MOTION_EASE.springMagnetic);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onMouseMove?.(e);
    if (!magnetic || !isFinePointerDevice() || prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const ry = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    rawX.set(Math.max(-1, Math.min(1, rx)) * MOTION_DISTANCE.magneticMaxPx);
    rawY.set(Math.max(-1, Math.min(1, ry)) * MOTION_DISTANCE.magneticMaxPx);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onMouseLeave?.(e);
    rawX.set(0);
    rawY.set(0);
  };

  const baseStyles =
    variant === "primary"
      ? "bg-primary text-primary-foreground border border-primary shadow-sm"
      : "bg-card text-foreground border border-border hover:border-foreground/45";

  return (
    <motion.a
      ref={ref}
      style={{ x, y }}
      whileTap={{ scale: 0.97 }}
      transition={MOTION_EASE.springTactile}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-lg px-4 sm:px-5 py-2.5 font-sans text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${baseStyles} ${className}`}
      {...(rest as Record<string, unknown>)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-500 ease-out group-hover:translate-x-full"
        style={{
          background:
            "linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.18) 50%, transparent 80%)",
        }}
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.a>
  );
}

/**
 * Mask reveal bergaya tirai tinta editorial untuk judul utama.
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
  const inView = useInView(ref, { once: true, amount: 0.25 });
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
            <span key={idx} className="inline-block w-full overflow-hidden align-bottom">
              <motion.span
                className="block will-change-transform"
                initial={{ y: "105%", opacity: 0.001 }}
                animate={
                  inView
                    ? { y: "0%", opacity: 1 }
                    : { y: "105%", opacity: 0.001 }
                }
                transition={{
                  duration: MOTION_DURATION.slow,
                  delay: delay + idx * MOTION_STAGGER.relaxed,
                  ease: MOTION_EASE.luxury,
                }}
              >
                {line}
              </motion.span>
            </span>
          ))
        ) : (
          <span className="inline-block w-full overflow-hidden align-bottom">
            <motion.span
              className="block will-change-transform"
              initial={{ y: "105%", opacity: 0.001 }}
              animate={
                inView
                  ? { y: "0%", opacity: 1 }
                  : { y: "105%", opacity: 0.001 }
              }
              transition={{
                duration: MOTION_DURATION.slow,
                delay,
                ease: MOTION_EASE.luxury,
              }}
            >
              {children}
            </motion.span>
          </span>
        )}
      </Tag>
    </div>
  );
}

/**
 * Self-drawing architectural hairline divider, with optional centered archival label.
 */
export function EditorialDivider({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  if (!label) {
    return (
      <div ref={ref} aria-hidden="true" className={`overflow-hidden ${className}`}>
        <motion.div
          initial={{ scaleX: 0, opacity: 0.3 }}
          animate={inView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0.3 }}
          transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.luxury }}
          className="h-[1px] w-full origin-left bg-gradient-to-r from-border via-[var(--accent-gold)]/55 to-border"
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`flex items-center gap-3 overflow-hidden ${className}`}
    >
      <motion.div
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.luxury }}
        className="h-[1px] flex-1 origin-left bg-gradient-to-r from-transparent via-border to-[var(--accent-gold)]/55"
      />
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </span>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.luxury }}
        className="h-[1px] flex-1 origin-right bg-gradient-to-l from-transparent via-border to-[var(--accent-gold)]/55"
      />
    </div>
  );
}

/**
 * Wrapper reveal lembut untuk blok konten besar saat memasuki viewport.
 */
export function EditorialReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.14 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: MOTION_DISTANCE.sm }}
      animate={
        inView ? { opacity: 1, y: 0 } : { opacity: 0, y: MOTION_DISTANCE.sm }
      }
      transition={{
        duration: MOTION_DURATION.medium,
        delay,
        ease: MOTION_EASE.luxury,
      }}
      className={className}
    >
      {children}
    </motion.div>
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
 * Kartu editorial dengan kemunculan staggered, tilt 3D zero-rerender,
 * dan sorotan radial mengikuti kursor.
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

  const rawRx = useMotionValue(0);
  const rawRy = useMotionValue(0);
  const rotateX = useSpring(rawRx, MOTION_EASE.springLuxury);
  const rotateY = useSpring(rawRy, MOTION_EASE.springLuxury);
  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);
  const spotlightOpacity = useMotionValue(0);

  const spotlightBg = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, var(--accent-gold-soft), transparent 65%)`;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !isFinePointerDevice() || prefersReducedMotion()) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const nx = (px / rect.width - 0.5) * 2;
    const ny = (py / rect.height - 0.5) * 2;
    rawRx.set(-ny * MOTION_DISTANCE.tiltMaxDeg);
    rawRy.set(nx * MOTION_DISTANCE.tiltMaxDeg);
    mouseX.set(px);
    mouseY.set(py);
    spotlightOpacity.set(1);
  };

  const handleLeave = () => {
    rawRx.set(0);
    rawRy.set(0);
    spotlightOpacity.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: MOTION_DISTANCE.md }}
      animate={
        inView ? { opacity: 1, y: 0 } : { opacity: 0, y: MOTION_DISTANCE.md }
      }
      transition={{
        duration: MOTION_DURATION.medium,
        delay,
        ease: MOTION_EASE.luxury,
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        transformPerspective: 960,
        rotateX,
        rotateY,
      }}
      className={`relative ${className}`}
    >
      {children}
      <motion.div
        aria-hidden="true"
        style={{
          background: spotlightBg,
          opacity: spotlightOpacity,
        }}
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
      />
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
        ease: MOTION_EASE.luxury,
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
export function MonochromeShimmer({
  className = "h-24 w-full rounded-xl",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`luxury-shimmer relative overflow-hidden bg-muted/70 ${className}`}
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
 * GPU-only spring transition, Escape close, dan focus trap aksesibel.
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
            className="fixed inset-0 bg-foreground/45 backdrop-blur-[4px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={MOTION_EASE.springLuxury}
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
