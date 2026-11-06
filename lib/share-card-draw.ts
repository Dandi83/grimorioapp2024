"use client";

import { SHARE_SIZES, type ShareCard, type ShareFormat } from "./share-card";

/**
 * The card of «Condividi come immagine» (PROMPT 50), drawn by the phone with Canvas 2D: no server, no external
 * service. Loaded only when the button is tapped (components/share/share-image-dialog.tsx imports this module).
 */

/**
 * PROMPT 68: every card on parchment, as the pages («pergamena illustrata»): light paper grain, a bordeaux frame
 * with copper corners, the label in small capitals, the title with a bordeaux capilettera, the ✦ divider and the
 * logo at the bottom. The theme of the data stays (lib/share-card.ts): «immagine» puts the picture of the creature
 * in a frame inside the card (JPEG), the others have no picture (PNG). Colours of the palette of the site only.
 */
const C = {
  paper: "#F6EFDF", ink: "#2B2118", bordeaux: "#7A1F2B", amber: "#E0A21A", rame: "#9C5B35",
  muted: "#5E4E3E", soft: "#6B5A48", boxFill: "#FFFBF0", boxLine: "#D9C9A3", edge: "#E9DDC2",
} as const;

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

/** A small pseudo-random sequence with a fixed seed: the same grain on every card, no Math.random. */
function seeded(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** The paper grain: one 256 px tile of lighter flecks (never darker: the text keeps its contrast), made once. */
let grain: HTMLCanvasElement | undefined;
function grainTile(): HTMLCanvasElement {
  if (grain) return grain;
  grain = document.createElement("canvas");
  grain.width = grain.height = 256;
  const g = grain.getContext("2d");
  if (!g) return grain;
  const random = seeded(68);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(255,252,244,${(0.25 + random() * 0.45).toFixed(2)})`;
    g.beginPath();
    g.ellipse(random() * 256, random() * 256, 0.6 + random() * 1.6, 0.5 + random() * 1.1, random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  return grain;
}

/** One copper corner (the L with a dot of .pg-angoli, app/globals.css), turned for each corner of the frame. */
function corner(ctx: Ctx, x: number, y: number, sx: 1 | -1, sy: 1 | -1, size: number) {
  const k = size / 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx * k, sy * k);
  ctx.strokeStyle = C.rame;
  ctx.fillStyle = C.rame;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(1, 11.5);
  ctx.lineTo(1, 3);
  ctx.arcTo(1, 1, 3, 1, 2);
  ctx.lineTo(11.5, 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(4.3, 4.3, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Parchment, grain, a warmer margin, the bordeaux frame (a line and a thin one inside) and the copper corners. */
function background(ctx: Ctx, w: number, h: number, story: boolean) {
  // A warmer margin outside the frame, plain colours: a gradient would be dithered and the PNG would pass 1 MB.
  ctx.fillStyle = C.edge;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = C.paper;
  ctx.fillRect(36, 36, w - 72, h - 72);
  const pattern = ctx.createPattern(grainTile(), "repeat");
  if (pattern) { ctx.fillStyle = pattern; ctx.fillRect(0, 0, w, h); }
  ctx.strokeStyle = C.bordeaux;
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, w - 72, h - 72);
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(50, 50, w - 100, h - 100);
  ctx.globalAlpha = 1;
  // Smaller corners on a square, so the logo at the bottom stays clear of them.
  const at = 62, size = story ? 60 : 48;
  corner(ctx, at, at, 1, 1, size);
  corner(ctx, w - at, at, -1, 1, size);
  corner(ctx, at, h - at, 1, -1, size);
  corner(ctx, w - at, h - at, -1, -1, size);
}

/** The four-pointed star of the divider (components/pergamena/pergamena.tsx, Stella), size × size. */
function star(ctx: Ctx, cx: number, cy: number, size: number) {
  const k = size / 12;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(k, k);
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.bezierCurveTo(6.5, 3.6, 8.4, 5.5, 12, 6);
  ctx.bezierCurveTo(8.4, 6.5, 6.5, 8.4, 6, 12);
  ctx.bezierCurveTo(5.5, 8.4, 3.6, 6.5, 0, 6);
  ctx.bezierCurveTo(3.6, 5.5, 5.5, 3.6, 6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The ✦ divider: thin ink lines fading out left and right, the bordeaux star in the middle. */
function divider(ctx: Ctx, x: number, y: number, width: number, starSize: number) {
  const mid = x + width / 2, gap = starSize * 0.9;
  const left = ctx.createLinearGradient(x, 0, mid - gap, 0);
  left.addColorStop(0, "rgba(43,33,24,0)");
  left.addColorStop(1, "rgba(43,33,24,0.55)");
  ctx.fillStyle = left;
  ctx.fillRect(x, y - 1, mid - gap - x, 2);
  const right = ctx.createLinearGradient(mid + gap, 0, x + width, 0);
  right.addColorStop(0, "rgba(43,33,24,0.55)");
  right.addColorStop(1, "rgba(43,33,24,0)");
  ctx.fillStyle = right;
  ctx.fillRect(mid + gap, y - 1, x + width - mid - gap, 2);
  ctx.fillStyle = C.bordeaux;
  star(ctx, mid, y, starSize);
}

/** The picture of a creature in a frame: cover inside a rounded box, a fine border and small copper corners. */
function framedPicture(ctx: Ctx, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 16);
  ctx.clip();
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
  ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
  roundRect(ctx, x, y, w, h, 16);
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.bordeaux;
  ctx.stroke();
}

/** The logo: «Il Grimorio.App» with «I» and «G» as bordeaux capilettera and «.App» in amber (LogoGrimorio). */
function logo(ctx: Ctx, x: number, y: number, size: number, serif: string) {
  const parts: [string, string, number][] = [["I", C.bordeaux, 1.35], ["l ", C.ink, 1], ["G", C.bordeaux, 1.35], ["rimorio", C.ink, 1], [".App", C.amber, 1]];
  let cursor = x;
  for (const [text, color, scale] of parts) {
    ctx.font = `700 ${Math.round(size * scale)}px ${serif}`;
    ctx.fillStyle = color;
    ctx.fillText(text, cursor, y);
    cursor += ctx.measureText(text).width;
  }
}

interface Block { height: number; draw: (y: number) => void }

/** Draws the card in a canvas of the format: label, title, English name, divider, picture, boxes, excerpt, attribution, logo. */
export async function drawCard(card: ShareCard, format: ShareFormat): Promise<HTMLCanvasElement> {
  const { w, h } = SHARE_SIZES[format];
  const story = format === "storia";
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");
  let image: HTMLImageElement | undefined;
  if (card.theme === "immagine" && card.image) image = await loadImage(card.image).catch(() => undefined);
  const { serif, sans } = families();
  background(ctx, w, h, story);
  ctx.textBaseline = "alphabetic";

  const pad = 112;
  const width = w - pad * 2;
  const gap = story ? 30 : 22;
  const head: Block[] = [];
  const body: Block[] = [];

  // Label: type and detail in spaced small capitals, the muted ink of the labels of the pages.
  const kickerSize = story ? 30 : 25;
  head.push({ height: kickerSize * 1.3, draw: y => {
    ctx.font = `700 ${kickerSize}px ${sans}`;
    ctx.fillStyle = C.muted;
    spaced(ctx, card.kicker.toUpperCase(), pad, y + kickerSize, kickerSize * 0.16, width);
  } });

  // Title: as large as it fits in 3 lines (story) or 2 (square); the first letter bordeaux and 1.35× (capilettera).
  const maxTitleLines = story ? 3 : 2;
  const first = Array.from(card.title)[0] ?? "";
  let titleSize = story ? 104 : 84;
  let titleLines: string[] = [];
  let capWidth = 0;
  const fit = (lines: number) => {
    ctx.font = `700 ${Math.round(titleSize * 1.35)}px ${serif}`;
    capWidth = ctx.measureText(first).width;
    ctx.font = `700 ${titleSize}px ${serif}`;
    // The room of the larger letter is kept on every line: the words wrap the same on all of them.
    titleLines = wrap(ctx, card.title, width - (capWidth - ctx.measureText(first).width), lines);
  };
  for (; titleSize >= 52; titleSize -= 4) {
    fit(99);
    if (titleLines.length <= maxTitleLines) break;
  }
  fit(maxTitleLines);
  const titleLead = titleSize * 1.06;
  const capRise = titleSize * 0.22;
  head.push({ height: capRise + titleLines.length * titleLead + 4, draw: y => {
    titleLines.forEach((line, i) => {
      const base = y + capRise + titleSize * 0.86 + i * titleLead;
      if (i === 0 && line.startsWith(first)) {
        ctx.font = `700 ${Math.round(titleSize * 1.35)}px ${serif}`;
        ctx.fillStyle = C.bordeaux;
        ctx.fillText(first, pad, base);
        ctx.font = `700 ${titleSize}px ${serif}`;
        ctx.fillStyle = C.ink;
        ctx.fillText(line.slice(first.length), pad + capWidth, base);
      } else {
        ctx.font = `700 ${titleSize}px ${serif}`;
        ctx.fillStyle = C.ink;
        ctx.fillText(line, pad, base);
      }
    });
  } });

  if (card.en) {
    const enSize = story ? 42 : 34;
    ctx.font = `italic 500 ${enSize}px ${serif}`;
    const enLines = wrap(ctx, card.en, width, 1);
    head.push({ height: enSize * 1.2, draw: y => {
      ctx.font = `italic 500 ${enSize}px ${serif}`;
      ctx.fillStyle = C.soft;
      ctx.fillText(enLines[0], pad, y + enSize * 0.9);
    } });
  }

  // The ✦ divider under the head, in the place of the 4 px line.
  const starSize = story ? 30 : 24;
  head.push({ height: starSize, draw: y => divider(ctx, pad, y + starSize / 2, story ? 460 : 380, starSize) });

  // Boxes: 2 columns on a story, one row on a square; bordeaux labels, ink values, on the light card colour.
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
    body.push({ height: rows * boxH + (rows - 1) * boxGap, draw: y => {
      card.boxes.forEach((box, i) => {
        const x = pad + (i % columns) * (boxW + boxGap), top = y + Math.floor(i / columns) * (boxH + boxGap);
        roundRect(ctx, x, top, boxW, boxH, 16);
        ctx.fillStyle = C.boxFill;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.boxLine;
        ctx.stroke();
        ctx.font = `700 ${labelSize}px ${sans}`;
        ctx.fillStyle = C.bordeaux;
        spaced(ctx, box.label.toUpperCase(), x + 16, top + 18 + labelSize, labelSize * 0.1, boxW - 32);
        ctx.font = `700 ${valueSize}px ${serif}`;
        ctx.fillStyle = C.ink;
        valueLines[i].forEach((line, n) => ctx.fillText(line, x + 16, top + 22 + labelSize * 1.3 + valueSize * 0.92 + n * valueSize * 1.12));
      });
    } });
  }

  const excerptSize = story ? 38 : 30;
  const excerptBlock = (maxLines: number): Block | undefined => {
    if (!card.excerpt) return undefined;
    const lead = excerptSize * 1.42;
    ctx.font = `400 ${excerptSize}px ${sans}`;
    const lines = wrap(ctx, card.excerpt, width, maxLines);
    return { height: lines.length * lead, draw: y => {
      ctx.font = `400 ${excerptSize}px ${sans}`;
      ctx.fillStyle = C.ink;
      lines.forEach((line, i) => ctx.fillText(line, pad, y + excerptSize + i * lead));
    } };
  };

  const tail: Block[] = [];
  if (card.attribution) {
    const size = story ? 22 : 19;
    tail.push({ height: size * 1.3, draw: y => {
      ctx.font = `400 ${size}px ${sans}`;
      ctx.fillStyle = C.soft;
      ctx.fillText(wrap(ctx, card.attribution!, width, 1)[0], pad, y + size);
    } });
  }

  // The logo at the bottom, the address on the right.
  const footerSize = story ? 44 : 36;
  const footerY = h - (story ? 200 : 128);
  const top = story ? 200 : 112;
  const bottom = footerY - footerSize - (story ? 64 : 40);
  const sum = (blocks: Block[]) => blocks.reduce((total, block) => total + block.height, 0) + gap * Math.max(0, blocks.length - 1);

  // The picture of a creature: in a frame between the title and the boxes, as large as the free space allows.
  const textBlocks = (lines: number) => [...head, ...body, ...[excerptBlock(lines)].filter((b): b is Block => Boolean(b)), ...tail];
  let blocks = textBlocks(story ? 4 : 3);
  if (image) {
    // On a square the excerpt gives a line to the picture.
    if (!story) blocks = textBlocks(2);
    const free = bottom - top - sum(blocks) - gap;
    const pictureH = Math.min(story ? Math.round(width * 0.62) : 300, free);
    if (pictureH >= (story ? 260 : 160)) {
      const pictureBlock: Block = { height: pictureH, draw: y => framedPicture(ctx, image!, pad, y, width, pictureH) };
      blocks = [...head, pictureBlock, ...blocks.slice(head.length)];
    }
  }
  // The text in the middle of the free space; never above the top margin.
  let y = Math.max(top, top + (bottom - top - sum(blocks)) / 2);
  for (const block of blocks) {
    block.draw(y);
    y += block.height + gap;
  }

  logo(ctx, pad, footerY, footerSize, serif);
  ctx.font = `600 ${story ? 28 : 24}px ${sans}`;
  ctx.fillStyle = C.soft;
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
