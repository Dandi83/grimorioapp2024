import type { Metadata } from "next";

/**
 * What Google reads of every public page (PROMPT 45), in one place: the address of the site, the shape of the titles
 * («Nome — Sezione · Il Grimorio.App», «(2014)» after the name of a 2014 page), descriptions of our own made from the
 * data (name, type, level, CR, edition: never the text of a card, never an SRD text), the canonical address without
 * parameters, Open Graph and Twitter with the same title and description. Only server metadata: no JavaScript.
 */

export const SITE_URL = "https://ilgrimorio.app";
export const SITE_NAME = "Il Grimorio.App";

export type SeoEdition = "2014" | "2024" | "entrambe";

/** «D&D 2024», «D&D 2014», «D&D 2014 e 2024». */
export function dndEdition(edition: SeoEdition | undefined): string {
  return edition === "2014" ? "D&D 2014" : edition === "entrambe" ? "D&D 2014 e 2024" : "D&D 2024";
}

/** «Palla di fuoco (2014) — Incantesimi · Il Grimorio.App»; without a section: «Compendio · Il Grimorio.App». */
export function seoTitle(name: string, section?: string, edition?: SeoEdition): string {
  return `${name}${edition === "2014" ? " (2014)" : ""}${section ? ` — ${section}` : ""} · ${SITE_NAME}`;
}

export const DESCRIPTION_MIN = 70;
export const DESCRIPTION_MAX = 160;
const TAIL = " su Il Grimorio.App.";

/**
 * A description between 70 and 160 characters: a short one gets « Consultala gratis su Il Grimorio.App.», a long one is
 * cut at a word with «…». The sentences are written for each type of page in lib/seo.ts and in the pages.
 */
export function fitDescription(text: string): string {
  let out = text.replace(/\s+/g, " ").trim();
  if (out.length < DESCRIPTION_MIN) out = `${out.replace(/[.\s]+$/, "")}. Consultala gratis${TAIL}`;
  if (out.length < DESCRIPTION_MIN) out = `${out} Schede e regole di D&D 5e in italiano.`;
  if (out.length > DESCRIPTION_MAX) {
    const cut = out.slice(0, DESCRIPTION_MAX - 1);
    out = `${cut.slice(0, Math.max(cut.lastIndexOf(" "), DESCRIPTION_MIN)).replace(/[,;:.\s]+$/, "")}…`;
  }
  return out;
}

/** The canonical path: no query, no fragment, never a trailing slash (but «/»). */
export function canonicalPath(path: string): string {
  const clean = path.split(/[?#]/)[0] || "/";
  return clean.length > 1 ? clean.replace(/\/+$/, "") : "/";
}

export interface PageSeo {
  /** The name of the page or card, as written on it. */
  name: string;
  /** The section it belongs to («Incantesimi», «Bestiario», «Armi»…); none for the top sections. */
  section?: string;
  edition?: SeoEdition;
  description: string;
  path: string;
  /** A title written whole (the Home). */
  title?: string;
  /** Kept as the page had it (PROMPT 45: the preview pictures are not changed). */
  images?: NonNullable<Metadata["openGraph"]>["images"];
}

/** title, description, canonical, Open Graph and Twitter of a public page, all agreeing. */
export function pageMetadata({ name, section, edition, description, path, title: whole, images }: PageSeo): Metadata {
  const title = whole ?? seoTitle(name, section, edition);
  const text = fitDescription(description);
  const url = canonicalPath(path);
  return {
    title,
    description: text,
    alternates: { canonical: url },
    openGraph: { title, description: text, url, type: "website", siteName: SITE_NAME, locale: "it_IT", ...(images ? { images } : {}) },
    twitter: { card: "summary", title, description: text },
  };
}

/** One step of the breadcrumb: the name shown and its address. */
export interface Crumb { name: string; path: string }

/** BreadcrumbList of schema.org: Home › Sezione › Scheda (absolute addresses). */
export function breadcrumbLd(crumbs: readonly Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...crumbs].map((crumb, index) => ({
      "@type": "ListItem", position: index + 1, name: crumb.name, item: `${SITE_URL}${canonicalPath(crumb.path) === "/" ? "/" : canonicalPath(crumb.path)}`,
    })),
  };
}

/** WebSite of schema.org with the search of the Home (/?cerca=…), for the Home only. */
export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: "it",
    potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?cerca={search_term_string}` }, "query-input": "required name=search_term_string" },
  };
}

const SPELL_LEVEL = (level: number) => (level === 0 ? "trucchetto" : `incantesimo di ${level}° livello`);

/** «Palla di fuoco, incantesimo di 3° livello di invocazione, D&D 2024. Scheda completa in italiano su Il Grimorio.App.» */
export function spellDescription(spell: { nome: string; livello: number; scuola?: string; edizione: SeoEdition }): string {
  const school = spell.scuola ? ` di ${spell.scuola.toLowerCase()}` : "";
  return fitDescription(`${spell.nome}, ${SPELL_LEVEL(spell.livello)}${school}, ${dndEdition(spell.edizione)}. Scheda completa in italiano${TAIL}`);
}

/**
 * «Aboleth, Aberrazione Grande, GS 10, D&D 2024. Statistiche, tratti e azioni in italiano su Il Grimorio.App.»
 * Only the head of the card (never a section: a hidden one of a creature of the redazione stays out too).
 */
export function monsterDescription(monster: { nome: string; tipo?: string; taglia?: string; gs?: string; edizione: SeoEdition; origine?: "redazione" | "community" }): string {
  const kind = [monster.tipo?.replace(/\s*\(.*\)$/, ""), monster.taglia].filter(Boolean).join(" ");
  const origin = monster.origine === "redazione" ? "creatura originale della redazione, " : monster.origine === "community" ? "creatura della community, " : "";
  return fitDescription(`${monster.nome}, ${origin}${kind}${monster.gs ? `, GS ${monster.gs}` : ""}, ${dndEdition(monster.edizione)}. Statistiche, tratti e azioni in italiano${TAIL}`);
}

/** The edition of a page that shows the editions it has: «2014 e 2024» with both, else the one it has. */
export function editionOfPage(has: { "2014"?: unknown; "2024"?: unknown }, shown: readonly string[] = ["2014", "2024"]): SeoEdition {
  const in2014 = !!has["2014"] && shown.includes("2014"), in2024 = !!has["2024"] && shown.includes("2024");
  return in2014 && in2024 ? "entrambe" : in2014 ? "2014" : "2024";
}

/** «Spada lunga: arma da guerra da mischia, D&D 2014 e 2024. Danni, proprietà e padronanza in italiano su Il Grimorio.App.» */
export function itemDescription(name: string, kind: string, edition: SeoEdition, what: string): string {
  return fitDescription(`${name}: ${kind}, ${dndEdition(edition)}. ${what} in italiano${TAIL}`);
}
