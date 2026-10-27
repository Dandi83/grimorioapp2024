import type { Metadata, Viewport } from "next";
import { EB_Garamond, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";

import { FavoritesProvider } from "@/components/favorites-provider";
import { BottomNav } from "@/components/bottom-nav";
import { SideNav } from "@/components/side-nav";
import { ContentFrame } from "@/components/layout/content-frame";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { InstallPrompt } from "@/components/install-prompt";
import { ServiceWorker } from "@/components/service-worker";
import { AppBadgeSync } from "@/components/app-badge-sync";
import { serviceWorkerEnabled } from "@/lib/service-worker-config";
import { PUBLIC_SECTIONS } from "@/lib/public-sections";
import { sectionView } from "@/lib/section-view";
import { PartsProvider } from "@/components/sections/parts-context";
import { AdminSessionProvider } from "@/components/admin-edit/admin-session";
import { EditionProvider } from "@/components/edition/edition-provider";
import { forcedEdition } from "@/lib/user-edition";
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Hidden sections (/admin/sezioni): out of the bottom bar for the public, labelled for the administrator.
  const { hidden, hiddenParts, hiddenCards, soon, admin } = await sectionView();
  // Cards hidden with the eye of the admin area are addresses too: the phone deletes their saved copies.
  const hiddenPaths = [...PUBLIC_SECTIONS.filter(section => hidden.includes(section.key)).flatMap(section => section.paths), ...hiddenCards];
  // Pages of a section with hidden parts or cards: the phone drops the copies saved before the change (the signature changes).
  const cardPrefix: Record<string, string> = { incantesimi: "/spell/", bestiario: "/mostro/" };
  const cardsOf = (key: string) => (cardPrefix[key] ? hiddenCards.filter(path => path.startsWith(cardPrefix[key])) : []);
  const partPaths = PUBLIC_SECTIONS.filter(section => !hidden.includes(section.key)).flatMap(section => {
    const parts = [...hiddenParts.filter(id => id.startsWith(`${section.key}:`)), ...cardsOf(section.key)];
    return parts.length ? section.paths.map(path => ({ path, signature: parts.join(",") })) : [];
  });
  return (
    <html
      lang="it"
      className={`${sourceSans.variable} ${ebGaramond.variable} bg-background`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <FavoritesProvider>
          {/* «La tua edizione» (one for the whole app); held to the only edition the public sees when the other is hidden everywhere. */}
          <EditionProvider forced={admin ? undefined : forcedEdition(hidden, hiddenParts)}>
            {/* Phone: one column (unchanged). Tablet (md): wider, 40 px from the sides. Computer (lg): the side
                column on the left takes the place of the bottom bar, the content fills the rest; without the
                column (admin area) the content is centred, up to about 1200 px. */}
            <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col border-border/60 sm:border-x md:w-[calc(100%-80px)] md:max-w-4xl lg:max-w-[1280px] lg:has-[>[data-side-nav]]:ml-[240px] lg:has-[>[data-side-nav]]:mr-0 lg:has-[>[data-side-nav]]:w-auto lg:has-[>[data-side-nav]]:max-w-none lg:has-[>[data-side-nav]]:border-x-0">
              {/* The offline notice sits in the page flow above the content: it never covers the controls at the top. */}
              <ServiceWorker enabled={serviceWorkerEnabled()} hiddenPaths={hiddenPaths} partPaths={partPaths} />
              <main className="min-w-0 flex-1 pb-[calc(80px+env(safe-area-inset-bottom,0px))] lg:pb-0">
                {/* AdminSessionProvider: the «Modifica» buttons, drawn in the browser after the server checks the session. */}
                <PartsProvider hidden={hiddenParts} admin={admin} soon={soon}><AdminSessionProvider><CharacterSessionProvider><ContentFrame>{children}</ContentFrame></CharacterSessionProvider></AdminSessionProvider></PartsProvider>
              </main>
              <BottomNav hidden={hidden} admin={admin} soon={soon} />
              {/* After the content in the page order (it is fixed on the left): on phones the order stays the same. */}
              <SideNav hidden={hidden} admin={admin} soon={soon} />
            </div>
            <InstallPrompt />
            <AppBadgeSync />
            <AnalyticsProvider />
          </EditionProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}
