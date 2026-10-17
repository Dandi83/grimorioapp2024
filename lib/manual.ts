import data from "./data/srd-manual-5.2.1-it.json";
import type { ManualCategory, ManualEntry } from "./manual-types";
// Keep source records and existing detail URLs stable; categorize navigation by subject.
export const manualEntries: ManualEntry[] = data.entries.map(entry => ({
  ...entry,
  category: (entry.category !== "personaggi" ? entry.category :
    entry.subgroup === "Classi" ? "classi" :
    entry.subgroup === "Background" ? "background" :
    entry.subgroup === "Specie" ? "specie" : "creazione") as ManualCategory,
  blocks: entry.blocks as ManualEntry["blocks"],
}));
export function manualAvailable(environment: string | undefined) { return environment === "preview"; }
export function getManualEntry(id: string) { return manualEntries.find(entry => entry.id === id); }
