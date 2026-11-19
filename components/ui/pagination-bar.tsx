"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = "data",
  className = "",
}: PaginationBarProps) {
  const pillGroupId = React.useId();
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <motion.nav
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-label="Navigasi Halaman"
      className={`mt-6 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 rounded-xl border border-border bg-card/85 px-3.5 py-3 sm:px-4 shadow-sm backdrop-blur-sm ${className}`}
    >
      <p className="text-center sm:text-left text-xs font-medium text-muted-foreground">
        Menampilkan{" "}
        <span className="font-bold tabular-nums text-foreground">
          {startItem}–{endItem}
        </span>{" "}
        dari{" "}
        <span className="font-bold tabular-nums text-foreground">
          {totalItems}
        </span>{" "}
        {itemLabel}
      </p>

      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        <motion.button
          whileHover={{ scale: 1.06, x: -1 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 360, damping: 22 }}
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          aria-label="Halaman sebelumnya"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </motion.button>

        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) =>
                p === 1 ||
                p === totalPages ||
                Math.abs(p - currentPage) <= 1
            )
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              const showEllipsis = prev !== undefined && p - prev > 1;
              const active = p === currentPage;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && (
                    <span className="px-1 text-xs text-muted-foreground">
                      …
                    </span>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={() => onPageChange(p)}
                    aria-label={`Halaman ${p}`}
                    aria-current={active ? "page" : undefined}
                    className={`relative inline-flex size-9 items-center justify-center rounded-lg font-mono text-xs font-bold tabular-nums transition-colors ${
                      active
                        ? "text-primary-foreground"
                        : "border border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId={`pagination-active-${pillGroupId}`}
                        transition={{ type: "spring", stiffness: 380, damping: 28 }}
                        className="absolute inset-0 rounded-lg bg-primary shadow-xs"
                      />
                    )}
                    <span className="relative z-10">{p}</span>
                  </motion.button>
                </React.Fragment>
              );
            })}
        </div>

        <motion.button
          whileHover={{ scale: 1.06, x: 1 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 360, damping: 22 }}
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          aria-label="Halaman berikutnya"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </motion.button>
      </div>
    </motion.nav>
  );
}
