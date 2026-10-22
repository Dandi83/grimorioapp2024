import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import { isAdmin } from "./admin-auth";
import type { PublicSectionKey } from "./public-sections";
import { hiddenSections } from "./section-visibility";

export interface SectionView {
  /** Sections the public does not see. */
  hidden: PublicSectionKey[];
  /** The viewer is the administrator: hidden sections stay navigable, with the «Nascosta» label. */
  admin: boolean;
}

/**
 * What this page shows. The public pages are built once and cached; the administrator's pages are
 * rendered for them only in preview mode (switched on at login and by every switch), so the cookie
 * is read only there and the cached pages stay the public ones.
 */
export const sectionView = cache(async (): Promise<SectionView> => {
  const hidden = await hiddenSections();
  if (!hidden.length || !(await draftMode()).isEnabled) return { hidden, admin: false };
  return { hidden, admin: await isAdmin() };
});

/** Sections to leave out of this page: none for the administrator. */
export async function sectionsOut(): Promise<PublicSectionKey[]> {
  const view = await sectionView();
  return view.admin ? [] : view.hidden;
}
