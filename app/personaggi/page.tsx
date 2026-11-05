import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CharactersApp } from "@/components/characters-beta/characters-app";
import type { CharacterNames } from "@/lib/characters-beta";
import srdSpells2024 from "@/lib/data/spell-reference-index.json";
import classes2024 from "@/lib/data/srd-classes-5.2.1-it.json";
import { feats } from "@/lib/feats";
import { sectionView } from "@/lib/section-view";
import { publicSpellId } from "@/lib/spell-public-id";

/**
 * «I miei personaggi» (PROMPT 62, beta). A shell: the characters of Total Party Kill arrive in the address (#pg=, #party=),
 * are read and saved in the browser (lib/characters-beta.ts); nothing goes to the server. The page only hands over the
 * names of the Grimorio's own pages (spells, feats, subclasses), so the links show the same names as the cards.
 * The section is gated by app/personaggi/layout.tsx: the public gets 404.
 */
/** The title only for whoever sees the page: the 404 of the public says nothing of it. */
export async function generateMetadata(): Promise<Metadata> {
  const view = await sectionView();
  const open = !view.hidden.includes("personaggi") || view.admin;
  return { ...(open ? { title: "I miei personaggi — Il Grimorio.App" } : {}), robots: { index: false, follow: false } };
}

function names(): CharacterNames {
  const spells = Object.fromEntries(srdSpells2024.map(spell => [publicSpellId(spell.id), spell.name]));
  const featNames = Object.fromEntries(feats.flatMap(feat => {
    const edition = feat.editions["2024"] ?? feat.editions["2014"];
    return edition ? [[feat.id, edition.nome]] : [];
  }));
  const subclasses = Object.fromEntries((classes2024.classi as { id: string; sottoclasse?: { nome?: string } }[])
    .flatMap(klass => (klass.sottoclasse?.nome ? [[klass.id, klass.sottoclasse.nome]] : [])));
  return { spells, feats: featNames, subclasses };
}

export default async function CharactersPage() {
  // The layout already answers 404 to the public; the page checks too, so its data (the names) never reach that answer.
  const view = await sectionView();
  if (view.hidden.includes("personaggi") && !view.admin) notFound();
  return <CharactersApp names={names()} />;
}
