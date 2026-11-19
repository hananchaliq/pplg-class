"use client";

import * as React from "react";
import { motion } from "motion/react";

interface UnoLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Logo Bulat Monokrom "UNO" — Kelas XII PPLG 1 MAKN Ende
 * Nuansa perak-gelatin & charcoal kertas tua dengan gerak orbit tipis & kilau interaktif.
 */
export function UnoLogo({ size = "md", className = "" }: UnoLogoProps) {
  const uid = React.useId().replace(/:/g, "");
  const dimensions =
    size === "sm"
      ? "size-9"
      : size === "lg"
        ? "size-12"
        : "size-10 sm:size-11";

  return (
    <motion.span
      aria-hidden="true"
      whileHover={{ scale: 1.08, rotate: -4 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 360, damping: 20 }}
      className={`group/logo relative inline-flex ${dimensions} shrink-0 items-center justify-center rounded-full shadow-sm select-none overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full overflow-visible"
      >
        <defs>
          <radialGradient
            id={`unoGrad-${uid}`}
            cx="32%"
            cy="24%"
            r="78%"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor="#3B3B38" />
            <stop offset="52%" stopColor="#262624" />
            <stop offset="100%" stopColor="#161615" />
          </radialGradient>
          <linearGradient
            id={`unoRing-${uid}`}
            x1="6"
            y1="4"
            x2="58"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ECE9E1" />
            <stop offset="50%" stopColor="#B8B4AA" />
            <stop offset="100%" stopColor="#6E6B64" />
          </linearGradient>
        </defs>

        <circle
          cx="32"
          cy="32"
          r="30.5"
          fill={`url(#unoGrad-${uid})`}
          stroke={`url(#unoRing-${uid})`}
          strokeWidth="2.5"
        />

        <motion.circle
          cx="32"
          cy="32"
          r="26"
          stroke="#C9C4B8"
          strokeWidth="1"
          strokeDasharray="2.5 2.5"
          opacity="0.68"
          style={{ transformOrigin: "32px 32px" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
        />

        <polygon
          points="32,8.5 33.8,11.5 32,14.5 30.2,11.5"
          fill="#E8E5DC"
        />
        <circle cx="24" cy="12.5" r="1.5" fill="#C9C4B8" opacity="0.9" />
        <circle cx="40" cy="12.5" r="1.5" fill="#C9C4B8" opacity="0.9" />

        <text
          x="32"
          y="36.5"
          textAnchor="middle"
          fontFamily="Old Standard TT, Georgia, serif"
          fontSize="16.5"
          fontWeight="700"
          letterSpacing="1.2"
          fill="#ECE9E1"
        >
          UNO
        </text>

        <path
          d="M22 44.5 L18.5 47 L22 49.5"
          stroke="#D6D2C9"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <polygon
          points="32,44.8 34.2,47 32,49.2 29.8,47"
          fill="#D6D2C9"
        />
        <path
          d="M42 44.5 L45.5 47 L42 49.5"
          stroke="#D6D2C9"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>

      {/* Kilau cahaya tipis diagonal saat kursor melintasi logo */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-tr from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover/logo:translate-x-full"
      />
    </motion.span>
  );
}
