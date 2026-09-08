import type { Metadata, Viewport } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { FavoritesProvider } from "@/components/favorites-provider";
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GrimorioApp — Incantesimi D&D 5e (2024)",
  description:
    "Consulta, cerca e filtra gli incantesimi di Dungeons & Dragons 5e edizione 2024 in italiano. Salva i preferiti e lancia i dadi. Progetto fan-made.",
  applicationName: "GrimorioApp",
  keywords: [
    "D&D",
    "Dungeons & Dragons",
    "incantesimi",
    "grimorio",
    "5e",
    "2024",
    "italiano",
  ],
  openGraph: {
    title: "GrimorioApp — Incantesimi D&D 5e (2024)",
    description:
      "Consulta, cerca e filtra gli incantesimi di D&D 5e (2024) in italiano.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="it"
      className={`${inter.variable} ${ebGaramond.variable} bg-background`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <FavoritesProvider>
          <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col border-border/60 sm:border-x">
            <main className="flex-1 pb-24">{children}</main>
            <BottomNav />
          </div>
        </FavoritesProvider>
      </body>
    </html>
  );
}
