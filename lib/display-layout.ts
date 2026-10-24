// Display-only layout repairs shared by every card (SRD files, cards edited or added in the reserved area,
// homebrew): line breaks, spaces, soft hyphens and bold split by the PDF pages. Never a word changed: the
// stored text stays as it is, attribution keeps comparing it with the files. Pure, safe in client code.

import repairs from "./data/layout-repairs-20261024.json";

/** Exact markup repairs the general rules cannot recognise (same words, different tags or breaks). */
const MARKUP_REPAIRS = (repairs.riparazioni as { da: string; a: string }[]);

const BREAKS = "(?:\\s*<br\\s*\\/?>\\s*)+";
const EMPHASIS = "(?:<\\/?(?:strong|b|em|i)>\\s*)*";
/**
 * The lines that rightly start after a break with a figure: spell lists of the creatures ("1° livello (3 slot):",
 * "3/giorno ciascuno:", "2 volte al giorno:"), numbered lists ("1. ", "2) ").
 */
const RIGHT_AFTER_BREAK = /^(?:\d+\s*[°º]\s*livello|\d+\s*\/\s*(?:giorno|riposo)|\d+\s+volt[ae]\b|\d+\s*[.)]\s)/i;
/**
 * A break inside a sentence: before it a letter, a figure, a comma or an apostrophe (no full stop, colon or
 * bracket), after it the sentence goes on in lower case, with a figure or an apostrophe.
 */
const MID_SENTENCE = new RegExp(`([\\p{L}\\p{N},'’])(${BREAKS})(${EMPHASIS})(?=[\\p{Ll}\\p{N}'’])`, "gu");
/** Bold (or italics) split in two by a break: "<strong>Resistenza leggendaria (3/giorno o</strong><br><br><strong>4/giorno…).</strong>". */
const SPLIT_EMPHASIS = new RegExp(`<(strong|b|em|i)>([^<]*)<\\/\\1>${BREAKS}<\\1>([^<]*)<\\/\\1>`, "gi");
/** Articles and prepositions elided with an apostrophe: no space after it ("l' incantatore" → "l'incantatore"). */
const ELISION = /(^|[^\p{L}])((?:l|d|un|dell|dall|nell|sull|all|coll|quest|quell|tutt|c|s|m|t|v|n)['’]) +(?=\p{L})/giu;

function repairProse(html: string): string {
  let text = html;
  // c) Soft hyphens of the PDF: invisible, but they split the words ("abo­ leth", "può ­scegliere").
  text = text.replace(/(\p{L})­\s*(?=\p{L})/gu, "$1").replace(/­/g, "");
  // b) One heading in one bold: an open bracket, or a lower-case continuation, joins the two halves.
  for (let pass = 0; pass < 4; pass++) {
    const joined = text.replace(SPLIT_EMPHASIS, (whole, tag: string, left: string, right: string) => {
      const open = (left.match(/\(/g) || []).length > (left.match(/\)/g) || []).length;
      const continues = !/[.:!?]\s*$/.test(left) && /^\s*[\p{Ll}\p{N}]/u.test(right);
      return open || continues ? `<${tag}>${left.trimEnd()} ${right.trimStart()}</${tag}>` : whole;
    });
    if (joined === text) break;
    text = joined;
  }
  // a) A break inside a sentence (a page or column change of the PDF): one space, no break.
  text = text.replace(MID_SENTENCE, (whole, before: string, _breaks: string, tags: string, offset: number, source: string) => {
    const next = source.slice(offset + whole.length);
    if (RIGHT_AFTER_BREAK.test(next)) return whole;
    return `${before}${/['’]/.test(before) ? "" : " "}${tags.trim()}`;
  });
  // d) Spaces: one between words, none before a comma or a full stop, none after an elided article.
  if (!text.includes("\n")) text = text.replace(/([^\s>]) {2,}(?=[^\s<])/g, "$1 ");
  text = text.replace(/(\p{L}) +([,;]|\.(?!\.))/gu, "$1$2").replace(ELISION, "$1$2");
  return text;
}

/** The text of a card ready for the page: same words, the PDF layout errors repaired. Tables (<pre>) stay as they are. */
export function normalizeLayout(html: string): string {
  if (!html) return html;
  let text = html;
  for (const repair of MARKUP_REPAIRS) if (text.includes(repair.da)) text = text.split(repair.da).join(repair.a);
  return text.split(/(<pre>[\s\S]*?<\/pre>)/i).map(part => (part.startsWith("<pre>") ? part : repairProse(part))).join("");
}

/** The words of a text, without markup, spaces or breaks: what a layout repair must never change. */
export function wordsOf(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/[\s­]+/g, "");
}
