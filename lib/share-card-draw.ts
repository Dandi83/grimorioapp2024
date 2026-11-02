"use client";

import { SHARE_SIZES, type ShareCard, type ShareFormat, type ShareTheme } from "./share-card";

/**
 * The card of «Condividi come immagine» (PROMPT 50), drawn by the phone with Canvas 2D: no server, no external
 * service. Loaded only when the button is tapped (components/share/share-image-dialog.tsx imports this module).
 */

interface Palette { ink: string; accent: string; soft: string; boxFill: string; boxLine: string; brand: string }
const DARK: Palette = { ink: "#FFFBF0", accent: "#E0A21A", soft: "rgba(255,251,240,0.74)", boxFill: "rgba(255,251,240,0.07)", boxLine: "rgba(224,162,26,0.55)", brand: "#E0A21A" };
const PAPER: Palette = { ink: "#2B2118", accent: "#7A1F2B", soft: "#6B5A48", boxFill: "#FFFBF0", boxLine: "#D9C9A3", brand: "#7A1F2B" };
const paletteOf = (theme: ShareTheme) => (theme === "pergamena" ? PAPER : DARK);

/** The families of the site (next/font variables on <html>), with the same fallbacks as the CSS. */
function families() {
  const style = getComputedStyle(document.documentElement);
  const serif = style.getPropertyValue("--font-eb-garamond").trim() || "Georgia";
  const sans = style.getPropertyValue("--font-source-sans").trim() || "system-ui";
  return { serif: `${serif}, Georgia, serif`, sans: `${sans}, system-ui, sans-serif` };
}

/** Waits for the fonts of the site in the weights drawn, so the first card is never in a fallback font. */
export async function fontsReady(): Promise<void> {
  if (!document.fonts) return;
  const { serif, sans } = families();
  await Promise.all([`700 80px ${serif}`, `italic 500 40px ${serif}`, `700 30px ${sans}`, `400 36px ${sans}`, `600 24px ${sans}`]
    .map(font => document.fonts.load(font).catch(() => [])));
  await document.fonts.ready;
}

type Ctx = CanvasRenderingContext2D;

/**
 * Lines of a text inside a width: whole words; a word wider than the line is broken. More than maxLines: the last
 * line is cut at a whole word and ends with «…». A text that arrives already cut («…» at the end) keeps it.
 */
export function wrap(ctx: Ctx, text: string, width: number, maxLines: number): string[] {
  const cut = text.endsWith("…");
  const words = (cut ? text.slice(0, -1) : text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    while (ctx.measureText(word).width > width) {
      // A word longer than the line (a long name): broken where it fits.
      let n = word.length - 1;
      while (n > 1 && ctx.measureText(word.slice(0, n)).width > width) n--;
      if (line) { lines.push(line); line = ""; }
      lines.push(word.slice(0, n));
      word = word.slice(n);
    }
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines && !cut) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[kept.length - 1] ?? "";
  // The last line kept ends with «…», whole words only, the punctuation before it left out.
  while (last && ctx.measureText(`${last}…`).width > width) last = last.includes(" ") ? last.slice(0, last.lastIndexOf(" ")) : last.slice(0, -1);
  kept[kept.length - 1] = `${last.replace(/[\s,;:.–—-]+$/, "")}…`;
  return kept;
}

/** Capitals with a little space between the letters (canvas letterSpacing is not everywhere yet). */
function spaced(ctx: Ctx, text: string, x: number, y: number, spacing: number, maxWidth: number) {
  let cursor = x;
  for (const char of text) {
    const w = ctx.measureText(char).width;
    if (cursor + w - x > maxWidth) break;
    ctx.fillText(char, cursor, y);
    cursor += w + spacing;
  }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  // Same domain only (the pictures of the creatures, /immagini-mostri/): the canvas is never «tainted».
  const url = new URL(src, window.location.href);
  if (url.origin !== window.location.origin) throw new Error("Immagine di un altro dominio");
  const image = new Image();
  image.decoding = "async";
  image.src = url.href;
  await image.decode();
  return image;
}

function background(ctx: Ctx, theme: ShareTheme, w: number, h: number, image?: HTMLImageElement) {
  if (theme === "pergamena") {
    ctx.fillStyle = "#F6EFDF";
    ctx.fillRect(0, 0, w, h);
    // The bordeaux frame: a thick line and a thin one inside.
    ctx.strokeStyle = "#7A1F2B";
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, w - 72, h - 72);
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 52, w - 104, h - 104);
    return;
  }
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#2B2118");
  gradient.addColorStop(1, "#5A1824");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  if (theme !== "immagine" || !image) return;
  // The picture over the whole card (cover), then dark towards the bottom where the text is.
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
  ctx.drawImage(image, (w - iw) / 2, (h - ih) / 2 * (h > w ? 0.6 : 1), iw, ih);
  const shade = ctx.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, "rgba(24,14,12,0.15)");
  shade.addColorStop(h > w ? 0.38 : 0.25, "rgba(24,14,12,0.2)");
  shade.addColorStop(h > w ? 0.62 : 0.55, "rgba(24,14,12,0.82)");
  shade.addColorStop(1, "rgba(24,14,12,0.96)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}

interface Block { height: number; draw: (y: number) => void }

/** Draws the card in a canvas of the format: kicker, title, English name, boxes, excerpt, attribution, footer. */
export async function drawCard(card: ShareCard, format: ShareFormat): Promise<HTMLCanvasElement> {
  const { w, h } = SHARE_SIZES[format];
  const story = format === "storia";
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");
  const theme: ShareTheme = card.theme;
  let image: HTMLImageElement | undefined;
  if (theme === "immagine" && card.image) image = await loadImage(card.image).catch(() => undefined);
  const effective: ShareTheme = theme === "immagine" && !image ? "scuro" : theme;
  const color = paletteOf(effective);
  const { serif, sans } = families();
  background(ctx, effective, w, h, image);
  ctx.textBaseline = "alphabetic";

  const pad = effective === "pergamena" ? 104 : 88;
  const width = w - pad * 2;
  const blocks: Block[] = [];
  const gap = story ? 30 : 22;

  // Kicker: type and detail in capitals, amber (bordeaux on parchment).
  const kickerSize = story ? 30 : 26;
  blocks.push({ height: kickerSize * 1.3, draw: y => {
    ctx.font = `700 ${kickerSize}px ${sans}`;
    ctx.fillStyle = color.accent;
    spaced(ctx, card.kicker.toUpperCase(), pad, y + kickerSize, kickerSize * 0.12, width);
  } });

  // Title: as large as it fits in 3 lines (story) or 2 (square).
  const maxTitleLines = story ? 3 : 2;
  let titleSize = story ? 108 : 88;
  let titleLines: string[] = [];
  for (; titleSize >= 52; titleSize -= 4) {
    ctx.font = `700 ${titleSize}px ${serif}`;
    titleLines = wrap(ctx, card.title, width, 99);
    if (titleLines.length <= maxTitleLines) break;
  }
  ctx.font = `700 ${titleSize}px ${serif}`;
  titleLines = wrap(ctx, card.title, width, maxTitleLines);
  const titleLead = titleSize * 1.04;
  blocks.push({ height: titleLines.length * titleLead + 6, draw: y => {
    ctx.font = `700 ${titleSize}px ${serif}`;
    ctx.fillStyle = color.ink;
    titleLines.forEach((line, i) => ctx.fillText(line, pad, y + titleSize * 0.86 + i * titleLead));
  } });

  if (card.en) {
    const enSize = story ? 42 : 36;
    ctx.font = `italic 500 ${enSize}px ${serif}`;
    const enLines = wrap(ctx, card.en, width, 1);
    blocks.push({ height: enSize * 1.2, draw: y => {
      ctx.font = `italic 500 ${enSize}px ${serif}`;
      ctx.fillStyle = color.soft;
      ctx.fillText(enLines[0], pad, y + enSize * 0.9);
    } });
  }

  // The rule under the head, as the 4 px line of the sheets.
  blocks.push({ height: 6, draw: y => { ctx.fillStyle = color.accent; ctx.fillRect(pad, y, story ? 160 : 132, 6); } });

  // Boxes: 2 columns on a story, one row on a square.
  if (card.boxes.length) {
    const columns = story ? Math.min(2, card.boxes.length) : card.boxes.length;
    const rows = Math.ceil(card.boxes.length / columns);
    const boxGap = 16;
    const boxW = (width - boxGap * (columns - 1)) / columns;
    const labelSize = story ? 22 : 18;
    let valueSize = story ? 36 : (columns > 3 ? 26 : 30);
    // Values in at most two lines: smaller when one does not fit.
    for (; valueSize > 20; valueSize -= 2) {
      ctx.font = `700 ${valueSize}px ${serif}`;
      if (card.boxes.every(box => wrap(ctx, box.value, boxW - 32, 99).length <= 2)) break;
    }
    ctx.font = `700 ${valueSize}px ${serif}`;
    const valueLines = card.boxes.map(box => wrap(ctx, box.value, boxW - 32, 2));
    const most = Math.max(...valueLines.map(lines => lines.length));
    const boxH = 22 + labelSize * 1.3 + most * valueSize * 1.12 + 18;
    blocks.push({ height: rows * boxH + (rows - 1) * boxGap, draw: y => {
      card.boxes.forEach((box, i) => {
        const x = pad + (i % columns) * (boxW + boxGap), top = y + Math.floor(i / columns) * (boxH + boxGap);
        roundRect(ctx, x, top, boxW, boxH, 18);
        ctx.fillStyle = color.boxFill;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color.boxLine;
        ctx.stroke();
        ctx.font = `700 ${labelSize}px ${sans}`;
        ctx.fillStyle = color.accent;
        spaced(ctx, box.label.toUpperCase(), x + 16, top + 18 + labelSize, labelSize * 0.1, boxW - 32);
        ctx.font = `700 ${valueSize}px ${serif}`;
        ctx.fillStyle = color.ink;
        valueLines[i].forEach((line, n) => ctx.fillText(line, x + 16, top + 22 + labelSize * 1.3 + valueSize * 0.92 + n * valueSize * 1.12));
      });
    } });
  }

  if (card.excerpt) {
    const size = story ? 38 : 31;
    const lead = size * 1.42;
    ctx.font = `400 ${size}px ${sans}`;
    const lines = wrap(ctx, card.excerpt, width, story ? 4 : 3);
    blocks.push({ height: lines.length * lead, draw: y => {
      ctx.font = `400 ${size}px ${sans}`;
      ctx.fillStyle = color.ink;
      lines.forEach((line, i) => ctx.fillText(line, pad, y + size + i * lead));
    } });
  }

  if (card.attribution) {
    const size = story ? 22 : 19;
    blocks.push({ height: size * 1.3, draw: y => {
      ctx.font = `400 ${size}px ${sans}`;
      ctx.fillStyle = color.soft;
      ctx.fillText(wrap(ctx, card.attribution!, width, 1)[0], pad, y + size);
    } });
  }

  // The footer: «📖 Il Grimorio.App» on the left (.App amber, bordeaux on parchment), the address on the right.
  const footerSize = story ? 40 : 34;
  const footerY = h - (story ? 250 : pad + (effective === "pergamena" ? 0 : 6));
  const total = blocks.reduce((sum, block) => sum + block.height, 0) + gap * (blocks.length - 1);
  const top = story ? 250 : pad;
  const bottom = footerY - footerSize - (story ? 70 : 44);
  // Text at the bottom on a picture, in the middle of the free space otherwise.
  let y = effective === "immagine" ? Math.max(top, bottom - total) : Math.max(top, top + (bottom - top - total) / 2);
  for (const block of blocks) {
    block.draw(y);
    y += block.height + gap;
  }

  ctx.font = `700 ${footerSize}px ${serif}`;
  const brand = "📖 Il Grimorio";
  ctx.fillStyle = color.ink;
  ctx.fillText(brand, pad, footerY);
  ctx.fillStyle = color.brand;
  ctx.fillText(".App", pad + ctx.measureText(brand).width, footerY);
  ctx.font = `600 ${story ? 28 : 24}px ${sans}`;
  ctx.fillStyle = color.soft;
  ctx.textAlign = "right";
  ctx.fillText("ilgrimorio.app", w - pad, footerY);
  ctx.textAlign = "left";
  return canvas;
}

/** JPEG for a picture, PNG for the others; each under 1 MB (a heavier JPEG is made again at a lower quality). */
export const MAX_BYTES = 1024 * 1024;

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("Immagine non creata"))), type, quality));
}

export interface CardFile { file: File; url: string; ms: number; width: number; height: number }

/** The file of a card: name «grimorio-<sheet>-<format>.png|jpg», with the time it took to make it. */
export async function cardFile(card: ShareCard, format: ShareFormat, slug: string): Promise<CardFile> {
  const start = performance.now();
  const canvas = await drawCard(card, format);
  const jpeg = card.theme === "immagine";
  let blob = await toBlob(canvas, jpeg ? "image/jpeg" : "image/png", jpeg ? 0.86 : undefined);
  for (const quality of [0.78, 0.68]) if (blob.size > MAX_BYTES) blob = await toBlob(canvas, "image/jpeg", quality);
  const extension = blob.type === "image/jpeg" ? "jpg" : "png";
  const file = new File([blob], `grimorio-${slug}-${format}.${extension}`, { type: blob.type });
  return { file, url: URL.createObjectURL(blob), ms: Math.round(performance.now() - start), width: canvas.width, height: canvas.height };
}
