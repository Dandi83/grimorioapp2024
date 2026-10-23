import { notFound } from "next/navigation";
import { spellName } from "@/lib/spell-name";
import type { Metadata } from "next";
import { CharacterWorkshop } from "@/components/characters/workshop";
import { manualEntries } from "@/lib/manual";
import { getAllSpells } from "@/lib/spells";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "I miei personaggi — Il Grimorio.App",
  robots: { index: false, follow: false },
};
export default async function CharactersPage() {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV === "production") notFound();
  const spells = await getAllSpells();
  const pick = (category: string) =>
    manualEntries.filter((e) => e.category === category).map((e) => ({ id: e.id, title: e.title }));
  return (
    <CharacterWorkshop
      choices={{
        classes: pick("classi"),
        species: pick("specie"),
        backgrounds: pick("background"),
        // The character workshop follows the 2024 rules.
        spells: spells
          .filter((s) => s.edizione !== "2014")
          .map((s) => ({ id: s.id, name: spellName(s.nome_italiano), level: s.livello_num }))
          .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "it")),
      }}
    />
  );
}
