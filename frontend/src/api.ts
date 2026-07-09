export interface Spell {
  id: string;
  nome_italiano: string;
  livello: string;
  tempo_di_lancio: string;
  gittata: string;
  componenti: string;
  durata: string;
  descrizione: string;
  livello_num: number;
  scuola: string;
  classi: string[];
}

export interface SpellsMeta {
  scuole: string[];
  classi: string[];
  livelli: number[];
}

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BASE_URL) {
  console.warn("EXPO_PUBLIC_BACKEND_URL is not defined");
}

async function request<T>(path: string): Promise<T> {
  const url = `${BASE_URL}/api${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function fetchSpells(params: {
  q?: string;
  livello?: number;
  scuola?: string;
  classe?: string;
}): Promise<Spell[]> {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.livello !== undefined) usp.set("livello", String(params.livello));
  if (params.scuola) usp.set("scuola", params.scuola);
  if (params.classe) usp.set("classe", params.classe);
  const qs = usp.toString();
  return request<Spell[]>(`/spells${qs ? `?${qs}` : ""}`);
}

export async function fetchMeta(): Promise<SpellsMeta> {
  return request<SpellsMeta>("/spells/meta");
}

export async function fetchSpell(id: string): Promise<Spell> {
  return request<Spell>(`/spells/${id}`);
}
