import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { isAdmin } from "./admin-auth";
import { effectiveHidden, partId, shownEditions, type Edition, type PublicSectionKey } from "./public-sections";
import { visibilityState } from "./section-visibility";

export interface SectionView {
  /** Sections the public does not see: hidden, or with all the parts of a set hidden. */
  hidden: PublicSectionKey[];
  /** Parts hidden from the public ("<section>:<part>"). */
  hiddenParts: string[];
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
  const view = { hidden, hiddenParts: state.parts };
  if ((!hidden.length && !state.parts.length) || !(await draftMode()).isEnabled) return { ...view, admin: false };
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

/** What the links of this page may not lead to: hidden sections and parts (for visibleLinks / isHiddenPath). */
export async function linksOut(): Promise<string[]> {
  return [...await sectionsOut(), ...await partsOut()];
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
