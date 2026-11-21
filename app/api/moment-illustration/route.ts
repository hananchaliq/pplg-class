import { NextRequest, NextResponse } from "next/server";

const PALETTES = [
  { skyTop: "#3D3D3A", skyBottom: "#C9C4B8", hill: "#5C5A54", ground: "#1F1F1D" },
  { skyTop: "#2A2A28", skyBottom: "#B5B1A7", hill: "#4A4843", ground: "#1A1A18" },
  { skyTop: "#4A4843", skyBottom: "#D6D2C9", hill: "#6E6B64", ground: "#222220" },
  { skyTop: "#333330", skyBottom: "#C5C1B6", hill: "#52504A", ground: "#1C1C1A" },
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
    <circle cx="${sunX}" cy="${sunY}" r="68" fill="#F3F1EA" fill-opacity="0.72" />
    <path d="M0 430 Q 240 310 520 390 T 800 360 L 800 600 L 0 600 Z" fill="${pal.hill}" fill-opacity="0.88" />
    <path d="M0 475 Q 360 395 800 465 L 800 600 L 0 600 Z" fill="${pal.ground}" />
    <!-- Siluet Kebersamaan Siswa XII PPLG 1 -->
    <g fill="#161614">
      <circle cx="310" cy="430" r="24" />
      <path d="M272 520 C278 468 342 468 348 520 Z" />
      <circle cx="400" cy="422" r="26" />
      <path d="M358 520 C366 462 434 462 442 520 Z" />
      <circle cx="490" cy="432" r="23" />
      <path d="M454 520 C460 470 520 470 526 520 Z" />
    </g>
    <rect x="20" y="20" width="760" height="560" fill="none" stroke="#F3F1EA" stroke-opacity="0.38" stroke-width="3" />
    <text x="48" y="552" font-family="'Special Elite', 'Courier New', monospace" font-size="20" fill="#F3F1EA" fill-opacity="0.88" letter-spacing="1.2">ARSIP MOMEN XII PPLG 1 · MAKN ENDE · NO. ${String(seed).padStart(3, "0")}</text>
  </svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
