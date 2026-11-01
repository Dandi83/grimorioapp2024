"use client";

import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";

import { useFavorites } from "@/components/favorites-provider";
import { MonsterRow } from "@/components/monster-row";
import { SpellRow } from "@/components/spell-row";
import { fetchFavoriteCards, favoriteCardsKept, readFavoriteCards, type FavoriteCards } from "@/lib/favorite-cards";

const sortRank = (value: number) => value >= 0 ? value : Number.POSITIVE_INFINITY;

/**
 * unavailable: the cards marked `nascosta` are hidden from the public (not the administrator, who sees them labelled).
 * The rows (PROMPT 43): only the saved cards, from /preferiti/schede (lib/favorite-cards.ts); at once from the copy kept
 * on the device, then from the network; offline, the copy. No favorite: nothing asked.
 */
export function FavoritesList({ unavailable = false }: { unavailable?: boolean }) {
  const { favorites, loaded, isFavorite, toggle } = useFavorites();
  const key = favorites.join("\n");
  // The answer of the network for this set of favorites: the rows, or null when it did not answer (offline).
  const [fresh, setFresh] = useState<{ key: string; cards: FavoriteCards | null } | null>(null);
  // The copy on the device, read once the favorites are (never on the server).
  const kept = useMemo(() => (loaded && key ? readFavoriteCards() : null), [loaded, key]);
  useEffect(() => {
    if (!loaded || !key) return;
    let alive = true;
    void fetchFavoriteCards(key.split("\n")).then(cards => { if (alive) setFresh({ key, cards }); });
    return () => { alive = false; };
  }, [loaded, key]);
  const answered = fresh?.key === key;
  const cards = answered && fresh.cards ? fresh.cards : kept;
  // Without a copy covering every favorite the list waits for the network: a short moment online; offline, the copy.
  const ready = loaded && (!key || answered || (!!kept && favoriteCardsKept(favorites, kept)));
  const offlineWithout = answered && !fresh.cards && !(kept && favoriteCardsKept(favorites, kept));
  const spells = cards?.spells ?? [];
  const monsters = cards?.monsters ?? [];

  const favSpells = spells
    .filter((s) => favorites.includes(s.id))
    .sort((a, b) => sortRank(a.livello_num) - sortRank(b.livello_num) || a.nome_italiano.localeCompare(b.nome_italiano, "it"));

  const favMonsters = monsters
    .filter((m) => favorites.includes(`mostro:${m.id}`))
    .sort((a, b) => sortRank(a.gs_num) - sortRank(b.gs_num) || a.nome.localeCompare(b.nome, "it"));

  return (
    <div>
      <header className="border-b border-border px-6 pb-4 pt-6">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Preferiti
        </h1>
        <p className="mt-1 text-[13px] tracking-wide text-muted">
          {ready
            ? `${favSpells.length} ${favSpells.length === 1 ? "incantesimo salvato" : "incantesimi salvati"} · ${favMonsters.length} ${favMonsters.length === 1 ? "mostro salvato" : "mostri salvati"}`
            : "\u00A0"}
        </p>
      </header>

      {ready && offlineWithout && (
        <p data-favorites-offline="" className="px-6 pt-3 text-sm leading-5 text-muted text-pretty">
          Sei offline: {favSpells.length + favMonsters.length ? "alcuni preferiti si vedranno" : "i preferiti si vedranno"} con la connessione.
        </p>
      )}
      {!ready || (offlineWithout && favSpells.length + favMonsters.length === 0) ? null : favSpells.length + favMonsters.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
          <Star size={56} className="text-muted" />
          <p className="mt-2 font-serif text-xl font-semibold text-foreground">
            Nessun preferito salvato.
          </p>
          <p className="text-sm leading-5 text-muted text-pretty">
            Aggiungi incantesimi e mostri ai preferiti per ritrovarli qui.
          </p>
        </div>
      ) : (
        <>
          {favSpells.length > 0 && (
            <section className="px-6 py-2" aria-label="Incantesimi preferiti">
              <h2 className="py-3 text-[12px] font-bold uppercase tracking-wider text-primary">Incantesimi</h2>
              <ul>{favSpells.map((spell, i) => (
                <li key={spell.id}>
                  {i > 0 && <div className="ml-[15px] h-px bg-divider" />}
                  <SpellRow spell={spell} fav={isFavorite(spell.id)} onToggle={toggle} unavailable={unavailable} />
                </li>
              ))}</ul>
            </section>
          )}
          {favMonsters.length > 0 && (
            <section className="px-6 py-2" aria-label="Mostri preferiti">
              <h2 className="py-3 text-[12px] font-bold uppercase tracking-wider text-primary">Mostri</h2>
              <ul>{favMonsters.map((monster, i) => (
                <li key={monster.id}>
                  {i > 0 && <div className="ml-[15px] h-px bg-divider" />}
                  <MonsterRow monster={monster} fav={isFavorite(`mostro:${monster.id}`)} onToggle={toggle} unavailable={unavailable} />
                </li>
              ))}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
