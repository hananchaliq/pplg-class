import type { Metadata } from "next";
import {
  Caveat,
  Old_Standard_TT,
  Source_Serif_4,
  Special_Elite,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { VisualTierProvider } from "@/lib/visual-tier";
import { SadAudioProvider } from "@/lib/sad-audio";
import { LoadingProvider } from "@/lib/loading-context";
import { PageFlipAudioProvider } from "@/lib/page-flip-audio";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AmbientParticles } from "@/components/layout/ambient-particles";
import { FilmEffectsOverlay } from "@/components/layout/film-effects-overlay";
import { VanishingPageTransition } from "@/components/layout/vanishing-page-transition";
import { EditorialToastProvider } from "@/components/ui/editorial-toast";
import {
  ReadingProgressBar,
  ViewfinderCursor,
} from "@/components/layout/editorial-chrome";

const oldStandardTT = Old_Standard_TT({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
  adjustFontFallback: true,
});

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-sans",
  adjustFontFallback: true,
});

const specialElite = Special_Elite({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-mono",
  adjustFontFallback: true,
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-hand",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "Ruang Kenangan XII PPLG 1 — MAKN Ende",
  description:
    "Arsip digital monokrom film dan koran kenangan angkatan XII PPLG 1 (Pengembangan Perangkat Lunak dan Gim), Madrasah Aliyah Kejuruan Negeri Ende.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon", type: "image/png" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon",
  },
  openGraph: {
    title: "Ruang Kenangan XII PPLG 1 — MAKN Ende",
    description:
      "Arsip digital monokrom film dan koran kenangan angkatan XII PPLG 1, MAKN Ende.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ruang Kenangan XII PPLG 1 — MAKN Ende",
    description:
      "Arsip digital monokrom film dan koran kenangan angkatan XII PPLG 1, MAKN Ende.",
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
      className={`${oldStandardTT.variable} ${sourceSerif4.variable} ${specialElite.variable} ${caveat.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-foreground"
      >
        <ThemeProvider>
          <VisualTierProvider>
            <SadAudioProvider>
              <PageFlipAudioProvider>
                <LoadingProvider>
                  <EditorialToastProvider>
                    <ReadingProgressBar />
                    <ViewfinderCursor />
                    <FilmEffectsOverlay />
                    <AmbientParticles />
                    <Navbar />
                    <main className="flex-1">
                      <VanishingPageTransition>{children}</VanishingPageTransition>
                    </main>
                    <Footer />
                  </EditorialToastProvider>
                </LoadingProvider>
              </PageFlipAudioProvider>
            </SadAudioProvider>
          </VisualTierProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
