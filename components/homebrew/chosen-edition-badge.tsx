"use client";

import { MonsterProvenanceBadge } from "@/components/monster-provenance-badge";
import { useUserEdition } from "@/components/edition/edition-provider";

/** A creature «2014 e 2024»: the dark label beside the name shows the edition chosen on this device (2024 until it is read). */
export function ChosenEditionBadge() {
  const { edition, forced } = useUserEdition();
  return <span data-chosen-edition={forced ?? edition}><MonsterProvenanceBadge edition={forced ?? edition} variant="dark" /></span>;
}
