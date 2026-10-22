"use client";

import { useEffect, useState } from "react";
import { useEditions } from "@/components/sections/parts-context";
import { EQUIPMENT_EDITION_KEY, type EquipmentEdition } from "@/lib/equipment-types";

const isEdition = (value: unknown): value is EquipmentEdition => value === "2014" || value === "2024";

/**
 * Edition of the Equipaggiamento section: "?edizione=2014" in the address, else the last choice
 * on this phone, else 2024. Pages are static (and saved for offline use), so it is read after mount.
 * section: an edition hidden there (/admin/sezioni) is never chosen, even if remembered: the other one is.
 */
export function useEquipmentEdition(section: string): [EquipmentEdition, (value: EquipmentEdition) => void] {
  const { allowed } = useEditions(section);
  const [chosen, setEdition] = useState<EquipmentEdition>("2024");
  const edition = allowed.includes(chosen) ? chosen : allowed[0];
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("edizione");
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(EQUIPMENT_EDITION_KEY);
    } catch {
      // no storage: 2024
    }
    const chosen = isEdition(requested) ? requested : isEdition(stored) ? stored : undefined;
    if (chosen) setEdition(chosen);
  }, []);
  const choose = (value: EquipmentEdition) => {
    if (!allowed.includes(value)) return;
    setEdition(value);
    try {
      window.localStorage.setItem(EQUIPMENT_EDITION_KEY, value);
    } catch {
      // the choice simply is not remembered
    }
    const url = new URL(window.location.href);
    if (url.searchParams.has("edizione")) {
      url.searchParams.set("edizione", value);
      window.history.replaceState(window.history.state, "", url);
    }
  };
  return [edition, choose];
}
