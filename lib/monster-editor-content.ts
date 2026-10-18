/** Guided editing uses the existing HTML columns; untouched source stays exact. */
export type MonsterContentBlock = {
  id: string;
  title: string;
  body: string;
  original?: { title: string; body: string; html: string };
};
export type MonsterContentState = { original: string; originalIds: string[]; blocks: MonsterContentBlock[] };

export function escapeEditorText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function decodeTitle(text: string): string {
  const entities: Record<string,string> = {amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ","#39":"'"};
  return text.replace(/<[^>]*>/g, "").replace(/&([^;]+);/g, (whole, name: string) => entities[name] ?? whole);
}

export function parseMonsterContent(html: string): MonsterContentState {
  const parts = html ? html.split(/(?:<br\s*\/?>\s*){2,}(?=\s*<(?:strong|b)>)/gi) : [];
  const blocks = parts.map((part, index) => {
    const heading = part.match(/^\s*<(strong|b)>([\s\S]*?)<\/\1>/i);
    const title = heading ? decodeTitle(heading[2]).trim() : "";
    const body = heading ? part.slice(heading[0].length) : part;
    return { id: `existing-${index}`, title, body, original: {title, body, html:part} };
  });
  return {original:html, originalIds:blocks.map(block=>block.id), blocks};
}

function unchanged(block: MonsterContentBlock): boolean {
  return !!block.original && block.title === block.original.title && block.body === block.original.body;
}

export function serializeMonsterContent(state: MonsterContentState): string {
  if (state.blocks.length === state.originalIds.length && state.blocks.every((block,index)=>block.id === state.originalIds[index] && unchanged(block))) return state.original;
  return state.blocks.filter(block=>block.title.trim() || block.body.replace(/<[^>]*>/g, "").trim()).map(block=>{
    if (unchanged(block)) return block.original!.html;
    const title = block.title.trim();
    const heading = title ? `<strong>${escapeEditorText(title)}${/[.!?:]$/.test(title) ? "" : "."}</strong> ` : "";
    return heading + sanitizeEditorHtml(block.body).trim();
  }).join("<br><br>");
}

/** Keep only the formatting understood by the public renderer, without attributes. */
export function sanitizeEditorHtml(html: string): string {
  return html.replace(/<(script|style|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/div>\s*<div\b[^>]*>/gi, "<br>")
    .replace(/<\/?div\b[^>]*>/gi, "<br>")
    .replace(/<\/?p\b[^>]*>/gi, "<br><br>")
    .replace(/<([^>]*)>/g, (_whole, raw: string) => {
      const match = raw.match(/^\s*(\/?)\s*([a-z0-9]+)/i);
      if (!match) return "";
      const tag = ({b:"strong",i:"em"} as Record<string,string>)[match[2].toLowerCase()] ?? match[2].toLowerCase();
      if (!["strong","em","br","pre"].includes(tag)) return "";
      return tag === "br" ? "<br>" : `<${match[1]}${tag}>`;
    })
    .replace(/(?:<br>){3,}/g, "<br><br>")
    .replace(/^(?:<br>)+|(?:<br>)+$/g, "");
}
