import type { Metadata, Viewport } from "next";
import { EB_Garamond, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";

import { FavoritesProvider } from "@/components/favorites-provider";
import { BottomNav } from "@/components/bottom-nav";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorker } from "@/components/service-worker";
import { serviceWorkerEnabled } from "@/lib/service-worker-config";
import "./globals.css";
import {CharacterSessionProvider} from "@/components/characters/session";

// Variable fonts: one file per style covers every weight used (text 400/600/700,
// titles 600/700, italic 500), lighter than one file per weight.
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-eb-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Il Grimorio.App — Incantesimi e Bestiario D&D 5e",
  description:
    "Consulta, cerca e filtra incantesimi, mostri e animali di Dungeons & Dragons 5e in italiano. Salva i preferiti. Progetto fan-made.",
  applicationName: "Il Grimorio.App",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Grimorio",
  },
  keywords: [
    "D&D",
    "Dungeons & Dragons",
    "incantesimi",
    "bestiario",
    "mostri",
    "grimorio",
    "5e",
    "2024",
    "italiano",
  ],
  openGraph: {
    title: "Il Grimorio.App — Incantesimi e Bestiario D&D 5e",
    description:
      "Consulta, cerca e filtra incantesimi, mostri e animali di D&D 5e in italiano.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#F6EFDF",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="it"
      className={`${sourceSans.variable} ${ebGaramond.variable} bg-background`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <FavoritesProvider>
          <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col border-border/60 sm:border-x">
            {/* The offline notice sits in the page flow above the content: it never covers the controls at the top. */}
            <ServiceWorker enabled={serviceWorkerEnabled()} />
            <main className="min-w-0 flex-1 pb-[calc(80px+env(safe-area-inset-bottom,0px))]">
              <CharacterSessionProvider>{children}</CharacterSessionProvider>
            </main>
            <BottomNav />
          </div>
          <InstallPrompt />
          <AnalyticsProvider />
        </FavoritesProvider>
      </body>
    </html>
  );
}
