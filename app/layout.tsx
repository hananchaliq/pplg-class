import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, Caveat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { VisualTierProvider } from "@/lib/visual-tier";
import { SadAudioProvider } from "@/lib/sad-audio";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AmbientParticles } from "@/components/layout/ambient-particles";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Album Kenangan XII PPLG 1 — MAKN Ende",
  description:
    "Album digital 3D hangat dan penuh nostalgia untuk Kelas XII PPLG 1 (Pengembangan Perangkat Lunak dan Gim), Madrasah Aliyah Kejuruan Negeri Ende.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon", type: "image/png" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon",
  },
  openGraph: {
    title: "Album Kenangan XII PPLG 1 — MAKN Ende",
    description:
      "Album digital 3D hangat dan penuh nostalgia untuk Kelas XII PPLG 1 (Pengembangan Perangkat Lunak dan Gim), Madrasah Aliyah Kejuruan Negeri Ende.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Album Kenangan XII PPLG 1 — MAKN Ende",
    description:
      "Album digital 3D hangat dan penuh nostalgia untuk Kelas XII PPLG 1 (Pengembangan Perangkat Lunak dan Gim), Madrasah Aliyah Kejuruan Negeri Ende.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${fraunces.variable} ${jakarta.variable} ${caveat.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-[var(--color-accent-warm)] selection:text-[#fbf6ec]"
      >
        <ThemeProvider>
          <VisualTierProvider>
            <SadAudioProvider>
              {/* Subtle SVG film grain overlay */}
              <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-50 opacity-[0.03] dark:opacity-[0.045]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                }}
              />
              <AmbientParticles />
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </SadAudioProvider>
          </VisualTierProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
