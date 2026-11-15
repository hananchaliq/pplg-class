import { NextRequest, NextResponse } from "next/server";

const PALETTES = [
  { skyTop: "#c86d3b", skyBottom: "#f0b67f", hill: "#2d6a6e", ground: "#3b281c" },
  { skyTop: "#2d6a6e", skyBottom: "#8bb8a8", hill: "#3b593f", ground: "#2a2019" },
  { skyTop: "#a84232", skyBottom: "#e49b6c", hill: "#4d382b", ground: "#241913" },
  { skyTop: "#3b593f", skyBottom: "#c4b07b", hill: "#2d524d", ground: "#281f17" },
];

export async function GET(req: NextRequest) {
  const seedParam = Number(req.nextUrl.searchParams.get("seed") || "1");
  const seed = Number.isFinite(seedParam) ? Math.max(1, Math.min(999, seedParam)) : 1;
  const pal = PALETTES[seed % PALETTES.length]!;
  const sunX = 180 + ((seed * 47) % 440);
  const sunY = 120 + ((seed * 23) % 90);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${pal.skyTop}" />
        <stop offset="100%" stop-color="${pal.skyBottom}" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#sky)" />
    <circle cx="${sunX}" cy="${sunY}" r="68" fill="#fbf3dc" fill-opacity="0.78" />
    <path d="M0 430 Q 240 310 520 390 T 800 360 L 800 600 L 0 600 Z" fill="${pal.hill}" fill-opacity="0.85" />
    <path d="M0 475 Q 360 395 800 465 L 800 600 L 0 600 Z" fill="${pal.ground}" />
    <!-- Siluet Kebersamaan Siswa XII PPLG 1 -->
    <g fill="#1c140e">
      <circle cx="310" cy="430" r="24" />
      <path d="M272 520 C278 468 342 468 348 520 Z" />
      <circle cx="400" cy="422" r="26" />
      <path d="M358 520 C366 462 434 462 442 520 Z" />
      <circle cx="490" cy="432" r="23" />
      <path d="M454 520 C460 470 520 470 526 520 Z" />
    </g>
    <rect x="20" y="20" width="760" height="560" fill="none" stroke="#fbf6ec" stroke-opacity="0.35" stroke-width="3" />
    <text x="48" y="552" font-family="Georgia, serif" font-size="22" fill="#fbf6ec" fill-opacity="0.85">Arsip Momen XII PPLG 1 · MAKN Ende #${seed}</text>
  </svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
