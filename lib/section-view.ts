import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { isAdmin } from "./admin-auth";
import { effectiveHidden, partId, shownEditions, type Edition, type PublicSectionKey } from "./public-sections";
import { cardPath, visibilityState, type CardKind } from "./section-visibility";

export interface SectionView {
  /** Sections the public does not see: hidden, or with all the parts of a set hidden. */
  hidden: PublicSectionKey[];
  /** Parts hidden from the public ("<section>:<part>"). */
  hiddenParts: string[];
  /** Single cards hidden from the public, by address ("/spell/<id>", "/mostro/<id>"). */
  hiddenCards: string[];
  /** The viewer is the administrator: hidden sections and parts stay visible, with the «Nascosta» label. */
  admin: boolean;
}

/**
 * What this page shows. The public pages are built once and cached; the administrator's pages are
 * rendered for them only in preview mode (switched on at login and by every switch), so the cookie
 * is read only there and the cached pages stay the public ones.
 */
export const sectionView = cache(async (): Promise<SectionView> => {
  const state = await visibilityState();
  const hidden = effectiveHidden(state.sections, state.parts);
  const view = { hidden, hiddenParts: state.parts, hiddenCards: state.cards };
  if ((!hidden.length && !state.parts.length && !state.cards.length) || !(await draftMode()).isEnabled) return { ...view, admin: false };
  return { ...view, admin: await isAdmin() };
});

/** Sections to leave out of this page: none for the administrator. */
export async function sectionsOut(): Promise<PublicSectionKey[]> {
  const view = await sectionView();
  return view.admin ? [] : view.hidden;
}

/** Parts to leave out of this page: none for the administrator. */
export async function partsOut(): Promise<string[]> {
  const view = await sectionView();
  return view.admin ? [] : view.hiddenParts;
}

/** Cards to leave out of this page (their addresses): none for the administrator. */
export async function cardsOut(): Promise<string[]> {
  const view = await sectionView();
  return view.admin ? [] : view.hiddenCards;
}

/** What the public links may not lead to, also for the administrator: the previews show the public card. */
export async function publicLinksOut(): Promise<string[]> {
  const view = await sectionView();
  return [...view.hidden, ...view.hiddenParts, ...view.hiddenCards];
}

/** What the links of this page may not lead to: hidden sections, parts and cards (for visibleLinks / isHiddenPath). */
export async function linksOut(): Promise<string[]> {
  return [...await sectionsOut(), ...await partsOut(), ...await cardsOut()];
}

/**
 * A list of spells or creatures for this page: hidden cards left out for the public; for the administrator
 * they stay, marked `nascosta` (the «Nascosta» label). With no hidden card the list is returned as it is.
 */
export async function visibleCards<T extends { id: string }>(kind: CardKind, list: T[]): Promise<(T & { nascosta?: true })[]> {
  const view = await sectionView();
  if (!view.hiddenCards.length) return list;
  const hidden = new Set(view.hiddenCards);
  const isHidden = (item: T) => hidden.has(cardPath(kind, item.id));
  return view.admin ? list.map(item => (isHidden(item) ? { ...item, nascosta: true as const } : item)) : list.filter(item => !isHidden(item));
}

/** Every card of the list kept, the hidden ones marked `nascosta` (Preferiti: «Non disponibile al momento» for the public). */
export async function markedCards<T extends { id: string }>(kind: CardKind, list: T[]): Promise<(T & { nascosta?: true })[]> {
  const view = await sectionView();
  if (!view.hiddenCards.length) return list;
  const hidden = new Set(view.hiddenCards);
  return list.map(item => (hidden.has(cardPath(kind, item.id)) ? { ...item, nascosta: true as const } : item));
}

/** A single card: not found for the public while hidden; true when the administrator sees it hidden. */
export async function cardHidden(kind: CardKind, id: string): Promise<boolean> {
  const view = await sectionView();
  const hidden = view.hiddenCards.includes(cardPath(kind, id));
  if (hidden && !view.admin) notFound();
  return hidden;
}

/**
 * A card that belongs to one edition (spells, creatures, conditions): not found for the public while
 * that edition is hidden; true when the administrator sees it hidden (they get the «Nascosta» bar).
 */
export async function editionCard(section: PublicSectionKey, edition: Edition): Promise<boolean> {
  const state = await partState(section, edition);
  if (!state.shown) notFound();
  return state.hidden;
}

/** A part: drawn (for everyone, or only for the administrator) and labelled «Nascosta». */
export async function partState(section: PublicSectionKey, part: string): Promise<{ shown: boolean; hidden: boolean }> {
  const view = await sectionView();
  const hidden = view.hiddenParts.includes(partId(section, part));
  return { shown: !hidden || view.admin, hidden };
}

/** The editions of a section drawn on this page (both for the administrator). */
export async function pageEditions(section: PublicSectionKey): Promise<Edition[]> {
  return shownEditions(section, await partsOut());
}

/**
 * The creature list of a page: without the homebrew creatures while their collection is hidden from the public
 * (the other collections are left out by the browser, which knows the hidden parts). Same list otherwise.
 */
export async function bestiaryList<T extends { homebrew?: true }>(list: T[]): Promise<T[]> {
  return (await partsOut()).includes(partId("bestiario", "homebrew")) ? list.filter(item => !item.homebrew) : list;
}
