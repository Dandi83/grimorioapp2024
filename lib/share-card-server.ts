import { englishName } from "./english-names";
import { excerpt, srdLine, type ShareCard } from "./share-card";
import type { Spell } from "./spells-types";
import type { Monster } from "./monsters-types";
import { collectionOf } from "./monsters-types";
import { pictureSrc } from "@/components/monster-picture";

/**
 * The cards of «Condividi come immagine» (PROMPT 50), one builder per kind of sheet. Only what the page shows: the
 * edition shown, never a hidden section; SRD sheets get the short attribution, NO SRD and our creatures none.
 */

type Edition = "2014" | "2024";

/** «V, S, M (un pizzico di fosforo)» → «V, S, M»: the box keeps the letters, the sheet keeps the materials. */
const componentLetters = (text: string) => text.replace(/\s*\([\s\S]*$/, "").trim() || text;

export function spellCard(spell: Spell, title: string, srd: boolean): ShareCard {
  const edition: Edition = spell.edizione === "2014" ? "2014" : "2024";
  const level = spell.livello_num === 0 ? "Trucchetto" : spell.livello_num > 0 ? `${spell.livello_num}° livello` : spell.livello;
  const en = englishName("incantesimi", edition, spell.id);
  const boxes = [["Lancio", spell.tempo_di_lancio], ["Gittata", spell.gittata], ["Componenti", componentLetters(spell.componenti || "")], ["Durata", spell.durata]]
    .filter(([, value]) => value?.trim()).map(([label, value]) => ({ label, value: value.trim() }));
  return { kind: "incantesimo", theme: "scuro", kicker: `Incantesimo · ${level}`, title, ...(en ? { en } : srd ? {} : { enFromSearch: true as const }), boxes, excerpt: excerpt(spell.descrizione || ""), ...(srd ? { attribution: srdLine(edition) } : {}) };
}

/** «17 (armatura naturale)» → «17». */
const firstNumber = (text?: string) => (/^\s*([+-]?\d+)/.exec(text || "")?.[1] ?? (text || "").trim());

export function monsterCard(monster: Partial<Monster> & { id: string }, edition: Edition, srd: boolean): ShareCard {
  const collection = collectionOf({ id: monster.id, homebrew: monster.homebrew_edizione, homebrew_autore: monster.homebrew_autore });
  const homebrew = collection === "grimorio" || collection === "homebrew";
  const kind = collection === "grimorio" ? "Mostro del Grimorio" : collection === "homebrew" ? "Creato da voi" : collection === "animali" ? "Animale" : "Mostro";
  const en = homebrew ? undefined : englishName("mostri", edition, monster.id);
  // Our creatures: only their description, when the public sees it (publicSheet took the hidden sections away).
  // The other sheets: the description, else the traits, else the actions, as printed.
  const text = homebrew ? monster.descrizione || "" : [monster.descrizione, monster.tratti, monster.azioni].find(part => part && part.replace(/<[^>]+>/g, "").trim()) || "";
  const boxes = [["CA", firstNumber(monster.classe_armatura)], ["PF", firstNumber(monster.punti_ferita)]]
    .filter(([, value]) => value).map(([label, value]) => ({ label, value }));
  const picture = monster.immagine ? pictureSrc(monster.immagine.v, "l") : undefined;
  return {
    kind: "mostro", theme: picture ? "immagine" : "scuro", kicker: `${kind}${monster.grado_sfida ? ` · GS ${monster.grado_sfida}` : ""}`, title: monster.nome || "",
    ...(en ? { en } : homebrew || srd ? {} : { enFromSearch: true as const }), boxes, excerpt: excerpt(text), ...(srd ? { attribution: srdLine(edition) } : {}), ...(picture ? { image: picture } : {}),
  };
}

/** The other sheets: all of them SRD texts shown with their source box. */
export function ruleCard(input: { kind: ShareCard["kind"]; theme?: ShareCard["theme"]; kicker: string; title: string; en?: string; boxes?: { label: string; value?: string | null }[]; text: string; edition: Edition }): ShareCard {
  return {
    kind: input.kind, theme: input.theme ?? "scuro", kicker: input.kicker, title: input.title, ...(input.en ? { en: input.en } : {}),
    boxes: (input.boxes ?? []).filter((box): box is { label: string; value: string } => !!box.value?.trim()).map(box => ({ label: box.label, value: box.value.trim() })),
    excerpt: excerpt(input.text), attribution: srdLine(input.edition),
  };
}
