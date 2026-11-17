"use client";

import * as React from "react";

interface UnoLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Logo Bulat "UNO" — Kelas XII PPLG 1 MAKN Ende
 * Filosofi Desain:
 * 1. Lingkaran Utuh (Unity): Melambangkan "UNO" (Satu Keluarga Besar XII PPLG 1 yang tak terputus).
 * 2. Tiga Bintang Puncak: Melambangkan 3 warna Danau Kelimutu Ende & 3 tahun perjalanan (Kelas X, XI, XII).
 * 3. Ornamen Berlian Tenun Ikat & Kurung Sudut <•>: Perpaduan budaya Ende Flores dan logika kode PPLG.
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
    <span
      aria-hidden="true"
      className={`relative inline-flex ${dimensions} shrink-0 items-center justify-center rounded-full shadow-sm select-none ${className}`}
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
            cx="30%"
            cy="24%"
            r="78%"
             gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor="#e68a3e" />
            <stop offset="48%" stopColor="#b84a27" />
            <stop offset="100%" stopColor="#5e1c10" />
          </radialGradient>
          <linearGradient
            id={`unoRing-${uid}`}
            x1="6"
            y1="4"
            x2="58"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffe7b3" />
            <stop offset="50%" stopColor="#e5ab55" />
            <stop offset="100%" stopColor="#9c5c1c" />
          </linearGradient>
        </defs>

        {/* Piringan Dasar Lingkaran Utama */}
        <circle
          cx="32"
          cy="32"
          r="30.5"
          fill={`url(#unoGrad-${uid})`}
          stroke={`url(#unoRing-${uid})`}
          strokeWidth="2.5"
        />

        {/* Cincin Dalam Tenun Ikat Putus-putus Halus */}
        <circle
          cx="32"
          cy="32"
          r="26"
          stroke="#f8d89a"
          strokeWidth="1"
          strokeDasharray="2.5 2.5"
          opacity="0.65"
        />

        {/* Tiga Bintang Kelimutu / 3 Tahun Angkatan (X, XI, XII) di Puncak Atas */}
        <polygon
          points="32,8.5 33.8,11.5 32,14.5 30.2,11.5"
          fill="#ffe6b0"
        />
        <circle cx="24" cy="12.5" r="1.5" fill="#f7ce7e" opacity="0.9" />
        <circle cx="40" cy="12.5" r="1.5" fill="#f7ce7e" opacity="0.9" />

        {/* Teks Utama "UNO" di Tengah Lingkaran */}
        <text
          x="32"
          y="36.5"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="16.5"
          fontWeight="900"
          letterSpacing="1.2"
          fill="#fff9f0"
        >
          UNO
        </text>

        {/* Simbol Kode PPLG < • > & Garis Tenun di Bagian Bawah */}
        <path
          d="M22 44.5 L18.5 47 L22 49.5"
          stroke="#ffdca0"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <polygon
          points="32,44.8 34.2,47 32,49.2 29.8,47"
          fill="#ffdca0"
        />
        <path
          d="M42 44.5 L45.5 47 L42 49.5"
          stroke="#ffdca0"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </svg>
    </span>
  );
}
