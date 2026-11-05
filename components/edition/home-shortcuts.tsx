"use client";

import Link from "next/link";
import { BookOpen, ScrollText, Skull } from "lucide-react";

import { useUserEdition } from "@/components/edition/edition-provider";
import { useEditions } from "@/components/sections/parts-context";
import { SoonTag } from "@/components/sections/soon-tag";
import type { Edition } from "@/lib/public-sections";

export interface HomeShortcut {
  href: string;
  label: string;
  /** The small ink icon of the tag (PROMPT 64): the same drawings as the navigation. */
  icon?: "incantesimi" | "bestiario" | "compendio";
  /** The section whose cards are counted, and their number in each edition. */
  section?: string;
  counts?: Record<Edition, number>;
  /** «In arrivo» (/admin/sezioni): attenuated, with the pill, to the «in costruzione» page. */
  soon?: boolean;
}

/** «Incantesimi · 388 del 2024»: the cards of «la tua edizione» (the other one where a section hides it). */
const ICONS = { incantesimi: BookOpen, bestiario: Skull, compendio: ScrollText };

function Shortcut({ href, label, icon, section, counts, soon }: HomeShortcut) {
  const { edition } = useUserEdition();
  const { allowed } = useEditions(section ?? "");
  const shown = allowed.includes(edition) ? edition : allowed[0];
  const Icon = icon ? ICONS[icon] : null;
  const mark = Icon && <Icon size={16} strokeWidth={1.9} aria-hidden="true" />;
  if (soon) return <Link href={href} prefetch={false} data-soon="" className="pg-attenuato">{mark}{label} <SoonTag /></Link>;
  return <Link href={href} prefetch={false}>{mark}{counts ? `${label} · ${counts[shown]} del ${shown}` : label}</Link>;
}

/** Computer Home: the quick ways into the catalog, with the numbers of the user's edition. */
export function HomeShortcuts({ links }: { links: HomeShortcut[] }) {
  return links.map(link => <Shortcut key={link.href} {...link} />);
}
