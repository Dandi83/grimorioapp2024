import data from "./data/original-descriptions-2024.json";

const descriptions = new Map(data.spells.map((spell) => [spell.id, spell]));

/** Fill audited empty rows only. Existing and future editorial descriptions win. */
export function applyOriginalDescription<T extends { id: string; descrizione: string }>(row: T): T {
  const source = descriptions.get(row.id);
  if (!source || row.descrizione?.trim()) return row;
  return {
    ...row,
    descrizione: source.descrizione,
    livello: source.livello,
    tempo_di_lancio: source.tempo_di_lancio,
    gittata: source.gittata,
    componenti: source.componenti,
    durata: source.durata,
  };
}

/** Never attach the summary's source or creature statistics to a later custom edit. */
export function getOriginalSource(id: string, description: string) {
  const source = descriptions.get(id);
  return source?.descrizione === description ? source : undefined;
}
