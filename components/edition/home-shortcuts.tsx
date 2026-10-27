"use client";

import Link from "next/link";

import { useUserEdition } from "@/components/edition/edition-provider";
import { useEditions } from "@/components/sections/parts-context";
import { SoonTag } from "@/components/sections/soon-tag";
import type { Edition } from "@/lib/public-sections";

export interface HomeShortcut {
  href: string;
  label: string;
  /** The section whose cards are counted, and their number in each edition. */
  section?: string;
  counts?: Record<Edition, number>;
  /** «In arrivo» (/admin/sezioni): attenuated, with the pill, to the «in costruzione» page. */
  soon?: boolean;
}

/** «Incantesimi · 388 del 2024»: the cards of «la tua edizione» (the other one where a section hides it). */
function Shortcut({ href, label, section, counts, soon }: HomeShortcut) {
  const { edition } = useUserEdition();
  const { allowed } = useEditions(section ?? "");
  const shown = allowed.includes(edition) ? edition : allowed[0];
  if (soon) return <Link href={href} prefetch={false} data-soon="" className="opacity-60">{label} <SoonTag /></Link>;
  return <Link href={href} prefetch={false}>{counts ? `${label} · ${counts[shown]} del ${shown}` : label}</Link>;
}

/** Computer Home: the quick ways into the catalog, with the numbers of the user's edition. */
export function HomeShortcuts({ links }: { links: HomeShortcut[] }) {
  return links.map(link => <Shortcut key={link.href} {...link} />);
}
