/**
 * «Importa mostro» (PROMPT 44): one JSON block, as in the administrator's drafts, becomes the draft of a creature «Dalla
 * redazione» (lib/homebrew-types.ts). Pure rules, no database: used by the page of the reserved area to check and by
 * the server to check again before saving. Never in the public pages.
 *
 * The texts may hold only <strong>, <em> and <br> (paragraphs apart with <br><br>): they become **bold**, *italics* and
 * new lines in the draft, so no HTML is ever stored; anything else is taken away and said. The numbers the sheet
 * computes (experience, proficiency bonus, initiative, passive Perception, saving throws) are checked against the
 * challenge rating and the abilities: the sheet always shows the computed ones.
 */

import { HABITATS } from "./habitats";
import {
  ABILITY_KEYS, ABILITY_SHORT, CHALLENGE_RATINGS, EDITORIAL_SECTIONS, HOMEBREW_ALIGNMENTS, HOMEBREW_TYPES,
  experienceOf, foldName, homebrewId, parseDraft, proficiency, type AbilityKey, type EntryBlock, type HomebrewDraft,
  type HomebrewEntry,
} from "./homebrew-types";
import { SIZES, parseGs } from "./monsters-types";
import { EDITORIAL_LABEL, HIDEABLE_SECTIONS, SECTION_LABEL, parseEditorialExtras } from "./editorial-draft";

export interface ImportIssue { campo: string; messaggio: string }
export interface ImportCheck {
  /** Blocking: nothing is saved while there is one. */
  errori: ImportIssue[];
  /** Not blocking: what was cleaned or computed again. */
  avvisi: ImportIssue[];
  draft?: HomebrewDraft;
  /** The address the card will have: homebrew-<id or name>. */
  id?: string;
}

const ENTRY_KEYS = ["tratti", "azioni", "azioni_bonus", "reazioni", "azioni_leggendarie"] as const satisfies readonly EntryBlock[];
export const IMPORT_KEYS = [
  "id", "nome", "tipo", "taglia", "allineamento", "grado_sfida", "gs_num", "px", "bonus_competenza", "classe_armatura", "iniziativa", "punti_ferita", "velocita",
  ...ABILITY_KEYS, "tiri_salvezza", "abilita", "vulnerabilita", "resistenze", "immunita", "immunita_danni", "immunita_condizioni", "sensi", "linguaggi", "habitat",
  "descrizione", ...ENTRY_KEYS, ...EDITORIAL_SECTIONS, "sezioni_nascoste", "immagine_alt", "immagine_crediti",
] as const;
const REQUIRED = ["nome", "tipo", "taglia", "allineamento", "grado_sfida", "classe_armatura", "punti_ferita", "velocita", ...ABILITY_KEYS, "azioni"] as const;

/** The names of the fields in the messages, as the sheet calls them. */
export const FIELD_NAME: Record<string, string> = {
  id: "id", nome: "Nome", tipo: "Tipo", taglia: "Taglia", allineamento: "Allineamento", grado_sfida: "Grado sfida", gs_num: "gs_num", px: "Punti esperienza (px)",
  bonus_competenza: "Bonus di competenza", classe_armatura: "Classe armatura", iniziativa: "Iniziativa", punti_ferita: "Punti ferita", velocita: "Velocità",
  forza: "Forza", destrezza: "Destrezza", costituzione: "Costituzione", intelligenza: "Intelligenza", saggezza: "Saggezza", carisma: "Carisma",
  tiri_salvezza: "Tiri salvezza", abilita: "Abilità", vulnerabilita: "Vulnerabilità", resistenze: "Resistenze", immunita: "Immunità", immunita_danni: "Immunità ai danni",
  immunita_condizioni: "Immunità alle condizioni", sensi: "Sensi", linguaggi: "Linguaggi", habitat: "Habitat", sezioni_nascoste: "Sezioni nascoste",
  immagine_alt: "Testo alternativo dell’immagine", immagine_crediti: "Crediti dell’immagine", scheda: "Scheda", json: "JSON",
  ...SECTION_LABEL,
};
const label = (campo: string) => FIELD_NAME[campo] ?? campo;

const ALLOWED_TAG = /^<\/?(?:strong|em)>$|^<br\s*\/?>$/i;
const ENTITIES: Record<string, string> = { amp: "&", lt: "‹", gt: "›", quot: "\"", apos: "’", "#39": "’", nbsp: " " };

/**
 * HTML of the drafts → text of the card: <strong>x</strong> → **x**, <em>x</em> → *x*, <br> → a new line (two: a new
 * paragraph). Scripts and styles go with their content; any other tag (links, attributes, images) goes and its text
 * stays. removed: the tags taken away, for the notice.
 */
export function htmlToMarks(html: string): { text: string; removed: string[] } {
  const removed = new Set<string>();
  let text = html.replace(/\r\n?/g, "\n").replace(/<(script|style|iframe|object|template)\b[\s\S]*?<\/\1\s*>/gi, (_all, tag: string) => { removed.add(`<${tag.toLowerCase()}>`); return ""; });
  text = text.replace(/<!--[\s\S]*?-->/g, () => { removed.add("commenti HTML"); return ""; });
  text = text.replace(/<[^>]*>?/g, tag => {
    if (ALLOWED_TAG.test(tag)) return tag.toLowerCase().replace(/\s+/g, "");
    const name = /^<\/?\s*([a-z0-9]+)/i.exec(tag)?.[1]?.toLowerCase();
    removed.add(name ? `<${name}>${/^<\/?\s*(?:strong|em|br)\b/i.test(tag) ? " con attributi" : ""}` : tag.slice(0, 20));
    return "";
  });
  text = text.replace(/\n+/g, " ")
    .replace(/<br\/?>/g, "\n")
    .replace(/<strong>([\s\S]*?)<\/strong>/g, (_all, inner: string) => inner.trim() ? `**${inner.trim()}**` : "")
    .replace(/<em>([\s\S]*?)<\/em>/g, (_all, inner: string) => inner.trim() ? `*${inner.trim()}*` : "")
    .replace(/<\/?(?:strong|em)>/g, "")
    .replace(/&(#39|[a-z]+);/gi, (all, name: string) => ENTITIES[name.toLowerCase()] ?? all)
    .replace(/[<>]/g, char => (char === "<" ? "‹" : "›"))
    .replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text, removed: [...removed] };
}

/** «<strong>Morso.</strong> testo<br><br><strong>Artigli.</strong> …» → the entries of the editor. */
function htmlToEntries(html: string): { entries: HomebrewEntry[]; removed: string[] } {
  const removed: string[] = [];
  // The rule labels («Colpito:», «Tiro per colpire in mischia:»…) are put in italics by the sheet: written plain here.
  const entries = html.replace(/<em>\s*([^<]*:)\s*<\/em>/gi, "$1").split(/(?:<br\s*\/?>\s*){2,}/i).map(part => {
    const head = /^\s*<strong>([\s\S]*?)<\/strong>\s*/i.exec(part);
    const name = head ? htmlToMarks(head[1]).text.replace(/\*/g, "").replace(/\.\s*$/, "").trim() : "";
    const body = htmlToMarks(head ? part.slice(head[0].length) : part);
    removed.push(...body.removed);
    return { nome: name, testo: body.text };
  }).filter(entry => entry.nome || entry.testo);
  return { entries, removed: [...new Set(removed)] };
}

const MASCULINE_SIZE: Record<string, string> = { minuscolo: "Minuscola", piccolo: "Piccola", medio: "Media", mastodontico: "Mastodontica" };
const ABILITY_BY_NAME: Record<string, AbilityKey> = Object.fromEntries(ABILITY_KEYS.flatMap(key => [[key, key], [ABILITY_SHORT[key].toLowerCase(), key]]));
const signed = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);
const numberIn = (text: string) => { const match = /[+\-−]?\s*\d+/.exec(text); return match ? Number(match[0].replace(/\s/g, "").replace("−", "-")) : NaN; };
const digits = (value: unknown) => String(value ?? "").replace(/[^\d]/g, "");

/**
 * Reads the JSON pasted in «Importa mostro»: a single object or an array with one object. All the problems are listed,
 * field by field; the draft comes only when there are no errors.
 */
export function checkImport(json: string): ImportCheck {
  const errori: ImportIssue[] = [];
  const avvisi: ImportIssue[] = [];
  const error = (campo: string, messaggio: string) => errori.push({ campo, messaggio });
  const warn = (campo: string, messaggio: string) => avvisi.push({ campo, messaggio });
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (problem) {
    const where = /position (\d+)/.exec(String((problem as Error)?.message))?.[1];
    return { errori: [{ campo: "json", messaggio: `Il testo non è un JSON valido${where ? ` (controlla intorno al carattere ${where})` : ""}: virgole, virgolette e parentesi.` }], avvisi };
  }
  if (Array.isArray(parsed)) {
    if (parsed.length !== 1) return { errori: [{ campo: "json", messaggio: `L’elenco deve contenere un solo mostro (ne contiene ${parsed.length}).` }], avvisi };
    parsed = parsed[0];
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { errori: [{ campo: "json", messaggio: "Serve un oggetto { … } con i campi del mostro." }], avvisi };
  const data = parsed as Record<string, unknown>;

  for (const key of Object.keys(data)) if (!(IMPORT_KEYS as readonly string[]).includes(key)) error(key, `Chiave sconosciuta «${key}»: controlla il nome (le chiavi ammesse sono quelle delle bozze).`);
  const empty = (value: unknown) => value === undefined || value === null || (typeof value === "string" && !value.trim());
  for (const key of REQUIRED) if (empty(data[key])) error(key, `${label(key)}: campo obbligatorio mancante.`);
  const text = (key: string): string => {
    const value = data[key];
    if (empty(value)) return "";
    if (typeof value === "number") return String(value);
    if (typeof value !== "string") { error(key, `${label(key)}: deve essere un testo.`); return ""; }
    if (/<[a-z/!][^>]*>/i.test(value)) {
      const { text: clean, removed } = htmlToMarks(value);
      warn(key, `${label(key)}: HTML non ammesso rimosso (${removed.join(", ") || "formattazione"}).`);
      return clean.replace(/\*/g, "").replace(/\n+/g, " ");
    }
    return value.trim();
  };
  const rich = (key: string): string => {
    const value = data[key];
    if (empty(value)) return "";
    if (typeof value !== "string") { error(key, `${label(key)}: deve essere un testo (paragrafi separati da <br><br>).`); return ""; }
    const { text: clean, removed } = htmlToMarks(value);
    if (removed.length) warn(key, `${label(key)}: HTML non ammesso rimosso (${removed.join(", ")}). Sono ammessi solo <strong>, <em> e <br>.`);
    return clean;
  };

  // Identity.
  const nome = text("nome");
  if (nome && (Array.from(nome).length < 2 || Array.from(nome).length > 60)) error("nome", "Nome: da 2 a 60 caratteri.");
  const rawType = text("tipo");
  const tipo = HOMEBREW_TYPES.find(type => foldName(type) === foldName(rawType.split(/[\s(]/)[0] ?? ""));
  if (rawType && !tipo) error("tipo", `Tipo: «${rawType}» non è tra quelli ammessi (${HOMEBREW_TYPES.join(", ")}).`);
  else if (tipo && foldName(rawType) !== foldName(tipo)) warn("tipo", `Tipo: resta «${tipo}»; il resto («${rawType.slice(tipo.length).trim()}») non compare nelle schede della redazione.`);
  const rawSize = foldName(text("taglia"));
  const taglia = SIZES.find(size => foldName(size) === rawSize) ?? MASCULINE_SIZE[rawSize];
  if (rawSize && !taglia) error("taglia", `Taglia: «${text("taglia")}» non è valida (${SIZES.join(", ")}).`);
  const rawAlignment = text("allineamento").toLowerCase();
  const allineamento = HOMEBREW_ALIGNMENTS.find(item => foldName(item) === foldName(rawAlignment));
  if (rawAlignment && !allineamento) error("allineamento", `Allineamento: «${text("allineamento")}» non è valido (${HOMEBREW_ALIGNMENTS.join(", ")}).`);

  // Challenge: experience, proficiency and gs_num must agree with it.
  const gs = text("grado_sfida").replace(/\s/g, "");
  const challenge = (CHALLENGE_RATINGS as readonly string[]).includes(gs) ? gs : undefined;
  if (gs && !challenge) error("grado_sfida", `Grado sfida: «${gs}» non è valido (da 0 a 30, oppure 1/8, 1/4, 1/2).`);
  if (challenge) {
    if (!empty(data.gs_num) && (typeof data.gs_num !== "number" || Math.abs(data.gs_num - parseGs(challenge)) > 1e-9))
      error("gs_num", `gs_num: ${JSON.stringify(data.gs_num)} non è coerente con il GS ${challenge} (deve essere ${parseGs(challenge)}).`);
    if (!empty(data.px) && digits(data.px) !== digits(experienceOf(challenge)))
      error("px", `Punti esperienza: ${String(data.px)} non è coerente con il GS ${challenge} (deve essere ${experienceOf(challenge)}).`);
    if (!empty(data.bonus_competenza) && numberIn(String(data.bonus_competenza)) !== proficiency(challenge))
      error("bonus_competenza", `Bonus di competenza: ${String(data.bonus_competenza)} non è coerente con il GS ${challenge} (deve essere +${proficiency(challenge)}).`);
  }

  // Abilities: whole numbers from 1 to 30.
  const scores = {} as Record<AbilityKey, number>;
  for (const key of ABILITY_KEYS) {
    const value = data[key];
    if (empty(value)) continue;
    const n = typeof value === "number" ? value : typeof value === "string" && /^\s*\d+\s*$/.test(value) ? Number(value) : NaN;
    if (!Number.isInteger(n) || n < 1 || n > 30) error(key, `${label(key)}: ${JSON.stringify(value)} non è un numero valido (intero da 1 a 30).`);
    else scores[key] = n;
  }
  const mod = (key: AbilityKey) => Math.floor(((scores[key] ?? 10) - 10) / 2);

  // Armour class and hit points: «17 (armatura naturale)», «136 (16d10 + 48)».
  const caText = text("classe_armatura");
  const ca = /^\s*(\d{1,2})\s*(?:\((.+)\))?\s*$/.exec(caText);
  if (caText && (!ca || Number(ca[1]) < 1 || Number(ca[1]) > 30)) error("classe_armatura", `Classe armatura: «${caText}» non è valida (per esempio 17 o «17 (armatura naturale)»).`);
  const pfText = text("punti_ferita");
  const pf = /^\s*(\d{1,3})\s*\(\s*(\d{1,2}d(?:4|6|8|10|12|20)(?:\s*[+\-−]\s*\d{1,3})?)\s*\)\s*$/.exec(pfText);
  if (pfText && !pf) error("punti_ferita", `Punti ferita: «${pfText}» non è valido (per esempio «136 (16d10 + 48)»: il numero e i dadi vita).`);

  // Saving throws: proficient where the value is the modifier plus the bonus.
  const prof = challenge ? proficiency(challenge) : 2;
  const proficient: AbilityKey[] = [];
  for (const part of text("tiri_salvezza").split(/[,;]/).map(item => item.trim()).filter(Boolean)) {
    const match = /^([A-Za-zÀ-ÿ]+)\.?\s*([+\-−]\s*\d+)$/.exec(part);
    const key = match ? ABILITY_BY_NAME[match[1].toLowerCase()] : undefined;
    if (!match || !key) { warn("tiri_salvezza", `Tiri salvezza: «${part}» non riconosciuto, ignorato.`); continue; }
    const value = numberIn(match[2]);
    if (value === mod(key) + prof) proficient.push(key);
    else if (value !== mod(key)) warn("tiri_salvezza", `Tiri salvezza: ${ABILITY_SHORT[key]} ${match[2].replace(/\s/g, "")} non torna con ${label(key)} ${scores[key] ?? "?"} e bonus +${prof}: la scheda mostra ${signed(mod(key) + (proficient.includes(key) ? prof : 0))}.`);
  }
  const initiative = text("iniziativa");
  if (initiative && numberIn(initiative) !== mod("destrezza")) warn("iniziativa", `Iniziativa: «${initiative}» diversa da quella della Destrezza; la scheda mostra ${signed(mod("destrezza"))} (${10 + mod("destrezza")}).`);

  // Immunities: one line in 2024 («danni; condizioni»).
  let immunitaDanni = text("immunita_danni"), immunitaCondizioni = text("immunita_condizioni");
  const immunita = text("immunita");
  if (immunita) {
    const [damage, ...conditions] = immunita.split(";").map(item => item.trim());
    immunitaDanni = [immunitaDanni, damage].filter(Boolean).join(", ");
    immunitaCondizioni = [immunitaCondizioni, conditions.join(", ")].filter(Boolean).join(", ");
  }
  // Senses: passive Perception is computed by the sheet.
  let sensi = text("sensi");
  const passive = /Percezione passiva\s*(\d+)/i.exec(sensi);
  if (passive) {
    sensi = sensi.replace(/[,;]?\s*Percezione passiva\s*\d+\s*[,;]?/i, ", ").replace(/^[\s,;]+|[\s,;]+$/g, "").replace(/\s*,\s*,\s*/g, ", ");
    const perception = /Percezione\s*([+\-−]\s*\d+)/i.exec(text("abilita"));
    const computed = 10 + (perception ? numberIn(perception[1]) : mod("saggezza"));
    if (Number(passive[1]) !== computed) warn("sensi", `Sensi: Percezione passiva ${passive[1]} diversa da quella calcolata (${computed}); la scheda mostra ${computed}.`);
  }
  const linguaggi = text("linguaggi").replace(/^[—–-]$/, "");

  // Habitat: a list of the habitats of the Bestiario.
  let habitat: string[] = [];
  if (!empty(data.habitat)) {
    if (!Array.isArray(data.habitat)) error("habitat", "Habitat: deve essere un elenco, per esempio [\"Montagna\", \"Sottosuolo\"].");
    else {
      for (const item of data.habitat) {
        const found = HABITATS.find(name => typeof item === "string" && foldName(name) === foldName(item));
        if (!found) error("habitat", `Habitat: «${String(item)}» non è valido (${HABITATS.join(", ")}).`);
        else habitat.push(found);
      }
      habitat = HABITATS.filter(name => habitat.includes(name));
    }
  }

  // The blocks of entries and the texts.
  const blocks = {} as Record<EntryBlock, HomebrewEntry[]>;
  for (const key of ENTRY_KEYS) {
    const value = data[key];
    if (empty(value)) { blocks[key] = []; continue; }
    if (typeof value !== "string") { error(key, `${label(key)}: deve essere un testo con le voci separate da <br><br>.`); blocks[key] = []; continue; }
    const { entries, removed } = htmlToEntries(value);
    if (removed.length) warn(key, `${label(key)}: HTML non ammesso rimosso (${removed.join(", ")}). Sono ammessi solo <strong>, <em> e <br>.`);
    blocks[key] = entries;
  }
  const descrizione = rich("descrizione");
  const sections = Object.fromEntries(EDITORIAL_SECTIONS.map(key => [key, rich(key)]).filter(([, value]) => value));

  const hidden = data.sezioni_nascoste;
  let sezioni: string[] = [];
  if (!empty(hidden)) {
    if (!Array.isArray(hidden)) error("sezioni_nascoste", "Sezioni nascoste: deve essere un elenco, per esempio [\"tana\", \"varianti\"].");
    else for (const key of hidden) {
      if (!(HIDEABLE_SECTIONS as readonly unknown[]).includes(key)) error("sezioni_nascoste", `Sezioni nascoste: «${String(key)}» non è una sezione (${HIDEABLE_SECTIONS.join(", ")}).`);
      else sezioni.push(key as string);
    }
    sezioni = HIDEABLE_SECTIONS.filter(key => sezioni.includes(key));
  }

  const rawId = text("id");
  if (rawId && !/^[a-z0-9][a-z0-9-]{0,80}$/.test(rawId)) error("id", `id: «${rawId}» non è valido (solo lettere minuscole, cifre e trattini).`);
  if (errori.length) return { errori, avvisi };

  const draft: HomebrewDraft = {
    edizione: "entrambe", nome, taglia: taglia!, tipo: tipo!, allineamento: allineamento!,
    ca: Number(ca![1]), ca_nota: ca![2]?.trim() ?? "", pf: Number(pf![1]), dadi_vita: pf![2].replace("−", "-"), velocita: text("velocita"),
    ...scores, ts_competenti: ABILITY_KEYS.filter(key => proficient.includes(key)),
    abilita: text("abilita"), vulnerabilita: text("vulnerabilita"), resistenze: text("resistenze"), immunita_danni: immunitaDanni, immunita_condizioni: immunitaCondizioni,
    sensi, linguaggi, habitat, grado_sfida: challenge!,
    ...blocks, ...(descrizione ? { descrizione } : {}),
    ...sections, ...(sezioni.length ? { sezioni_nascoste: sezioni as HomebrewDraft["sezioni_nascoste"] } : {}),
    ...(text("immagine_alt") ? { immagine_alt: text("immagine_alt") } : {}), ...(text("immagine_crediti") ? { immagine_crediti: text("immagine_crediti") } : {}),
    testo_ricco: true,
  };
  // The checks of every save of the reserved area: lengths, characters, at least one action.
  const checked = parseDraft(draft, { editorial: true });
  if (!checked.ok) return { errori: [{ campo: "scheda", messaggio: checked.error }], avvisi };
  const extras = parseEditorialExtras(draft);
  if (!extras.ok) return { errori: [{ campo: "scheda", messaggio: extras.error }], avvisi };
  return { errori, avvisi, draft: { ...checked.draft, ...extras.extras }, id: rawId ? homebrewId(rawId.replace(/^homebrew-/, "").replace(/-/g, " ")) : homebrewId(nome) };
}

/** One change of «Sovrascrivi»: the field and its value before and after, short. */
export interface FieldChange { campo: string; prima: string; dopo: string }

const short = (value: unknown) => {
  const text = value === undefined || value === null ? "" : typeof value === "string" ? value : Array.isArray(value) && value.every(item => typeof item === "string") ? value.join(", ")
    : Array.isArray(value) ? value.map(entry => (entry as HomebrewEntry).nome || "(introduzione)").join(", ") : JSON.stringify(value);
  const flat = text.replace(/\s+/g, " ").trim();
  return flat ? (flat.length > 90 ? `${flat.slice(0, 89)}…` : flat) : "—";
};
const DRAFT_FIELDS: [keyof HomebrewDraft, string][] = [
  ["nome", "Nome"], ["tipo", "Tipo"], ["taglia", "Taglia"], ["allineamento", "Allineamento"], ["grado_sfida", "Grado sfida"], ["ca", "Classe armatura"], ["ca_nota", "Nota della CA"],
  ["pf", "Punti ferita"], ["dadi_vita", "Dadi vita"], ["velocita", "Velocità"], ...ABILITY_KEYS.map(key => [key, label(key)] as [AbilityKey, string]),
  ["ts_competenti", "Tiri salvezza (competenze)"], ["abilita", "Abilità"], ["vulnerabilita", "Vulnerabilità"], ["resistenze", "Resistenze"], ["immunita_danni", "Immunità ai danni"],
  ["immunita_condizioni", "Immunità alle condizioni"], ["sensi", "Sensi"], ["linguaggi", "Linguaggi"], ["habitat", "Habitat"], ["descrizione", "Descrizione"],
  ...ENTRY_KEYS.map(key => [key, label(key)] as [EntryBlock, string]), ...EDITORIAL_SECTIONS.map(key => [key, EDITORIAL_LABEL[key]] as [keyof HomebrewDraft, string]),
  ["sezioni_nascoste", "Sezioni nascoste"], ["immagine_alt", "Testo alternativo dell’immagine"], ["immagine_crediti", "Crediti dell’immagine"], ["edizione", "Edizione"],
];
/** What «Sovrascrivi» would change on the saved card (the picture stays). */
export function draftChanges(before: HomebrewDraft, after: HomebrewDraft): FieldChange[] {
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? (Array.isArray(b) ? [] : "")) === JSON.stringify(b ?? (Array.isArray(a) ? [] : ""));
  return DRAFT_FIELDS.filter(([key]) => !same(before[key], after[key])).map(([key, name]) => ({ campo: name, prima: short(before[key]), dopo: short(after[key]) }));
}
