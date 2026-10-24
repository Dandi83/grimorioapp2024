"use client";

import { useEffect, useState } from "react";
import { useUserEdition } from "@/components/edition/edition-provider";
import { useEditions } from "@/components/sections/parts-context";
import type { EquipmentEdition } from "@/lib/equipment-types";
import { isEdition } from "@/lib/user-edition";

/**
 * Edition of a Compendio page (Equipaggiamento, Condizioni, Oggetti magici, Classi): "?edizione=2014" in
 * the address opens that edition without changing the user's one; else «la tua edizione»
 * (components/edition/edition-provider.tsx). Pages are static (and saved for offline use), so both are
 * read after mount. Choosing with the 2024 · 2014 buttons changes the edition of the whole app.
 * section: an edition hidden there (/admin/sezioni) is never chosen: the other one is.
 */
export function useEquipmentEdition(section: string): [EquipmentEdition, (value: EquipmentEdition) => void] {
  const { allowed } = useEditions(section);
  const { edition: userEdition, choose: chooseUserEdition } = useUserEdition();
  const [requested, setRequested] = useState<EquipmentEdition | null>(null);
  const wanted = requested ?? userEdition;
  const edition = allowed.includes(wanted) ? wanted : allowed[0];
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("edizione");
    if (isEdition(value)) setRequested(value);
  }, []);
  const choose = (value: EquipmentEdition) => {
    if (!allowed.includes(value)) return;
    setRequested(null);
    chooseUserEdition(value);
    const url = new URL(window.location.href);
    if (url.searchParams.has("edizione")) {
      url.searchParams.set("edizione", value);
      window.history.replaceState(window.history.state, "", url);
    }
  };
  return [edition, choose];
}
