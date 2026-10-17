import data from "./data/srd-manual-5.2.1-it.json";
import type { ManualEntry } from "./manual-types";
export const manualEntries = data.entries as ManualEntry[];
export function manualAvailable(environment: string | undefined) { return environment === "preview"; }
export function getManualEntry(id: string) { return manualEntries.find(entry => entry.id === id); }
