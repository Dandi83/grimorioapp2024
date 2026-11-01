import "server-only";
import { createHash } from "node:crypto";

import { pool } from "./db";
import { PICTURE_SIZES, type PictureSize } from "@/components/monster-picture";

/**
 * The pictures of the creatures «Dalla redazione» (PROMPT 44), kept in the database: no external service, no file
 * storage, nothing to set on Vercel. At the upload a JPG or PNG becomes three WebP sizes (phone 480, tablet 800,
 * computer 1200 px wide, never enlarged), each under 150 KB. The version (a hash of the picture) is in the address of
 * every file: a new picture is a new address, so the files can be kept by the browsers for a year.
 * - grimorio_monster_images: one row per version and size (additive table, created at the first upload).
 * The card refers to the version in its draft (scheda->immagine); a version no card uses is never served to the public.
 */

export const PICTURE_MAX_BYTES = 150 * 1024;
/** What the editor may send: the browser makes the photo smaller first, this is a safety ceiling. */
export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

let ready: Promise<void> | undefined;
export function ensurePictureTable() {
  ready ??= pool.query(`CREATE TABLE IF NOT EXISTS grimorio_monster_images (
    versione text NOT NULL,
    misura text NOT NULL CHECK (misura IN ('s', 'm', 'l')),
    larghezza integer NOT NULL,
    altezza integer NOT NULL,
    byte integer NOT NULL,
    webp bytea NOT NULL,
    creata_il timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (versione, misura)
  )`).then(() => undefined).catch(error => { ready = undefined; throw error; });
  return ready;
}

export interface PictureSaved { v: string; w: number; h: number; sizes: Record<PictureSize, { w: number; h: number; bytes: number }> }
type Convert = { ok: true; picture: PictureSaved } | { ok: false; error: string };

export interface PictureFile { size: PictureSize; data: Buffer; w: number; h: number }
type Made = { ok: true; v: string; files: PictureFile[] } | { ok: false; error: string };

/** JPG or PNG → three WebP sizes under 150 KB; the quality goes down step by step until each fits. Nothing is saved. */
export async function makePictureFiles(input: Buffer): Promise<Made> {
  const { default: sharp } = await import("sharp");
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    return { ok: false, error: "Il file non è un’immagine leggibile: usa un JPG o un PNG." };
  }
  if (meta.format !== "jpeg" && meta.format !== "png") return { ok: false, error: "Formato non ammesso: usa un JPG o un PNG." };
  if (!meta.width || !meta.height || meta.width < 200 || meta.height < 120) return { ok: false, error: "Immagine troppo piccola: almeno 200 × 120 pixel." };
  const files: PictureFile[] = [];
  for (const size of Object.keys(PICTURE_SIZES) as PictureSize[]) {
    let data: Buffer | undefined;
    let info: { width: number; height: number } | undefined;
    // First the quality, then (a very detailed picture) the width too, until the file fits.
    let width: number = PICTURE_SIZES[size];
    attempts: for (let round = 0; round < 6; round++, width = Math.round(width * 0.85)) {
      for (const quality of round ? [50, 40] : [82, 74, 66, 58, 50, 42, 34]) {
        // rotate(): the photo the right way up (EXIF); the EXIF and the other metadata are not kept in the WebP.
        const out = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5 }).toBuffer({ resolveWithObject: true });
        data = out.data;
        info = out.info;
        if (data.length <= PICTURE_MAX_BYTES) break attempts;
      }
    }
    if (!data || !info || data.length > PICTURE_MAX_BYTES) return { ok: false, error: "Non riesco a portare l’immagine sotto i 150 KB: prova con una foto meno dettagliata." };
    files.push({ size, data, w: info.width, h: info.height });
  }
  return { ok: true, v: createHash("sha256").update(files.map(file => file.data.toString("base64")).join(".")).digest("hex").slice(0, 16), files };
}

/** makePictureFiles, then the three files saved in the database (the same picture twice: one version). */
export async function convertPicture(input: Buffer): Promise<Convert> {
  const made = await makePictureFiles(input);
  if (!made.ok) return made;
  const { v, files } = made;
  const sizes = Object.fromEntries(files.map(file => [file.size, { w: file.w, h: file.h, bytes: file.data.length }])) as PictureSaved["sizes"];
  await ensurePictureTable();
  for (const file of files) {
    await pool.query(`INSERT INTO grimorio_monster_images (versione, misura, larghezza, altezza, byte, webp) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (versione, misura) DO NOTHING`, [v, file.size, file.w, file.h, file.data.length, file.data]);
  }
  return { ok: true, picture: { v, w: sizes.l.w, h: sizes.l.h, sizes } };
}

const MISSING_TABLE = "42P01";
export async function readPicture(v: string, size: PictureSize): Promise<Buffer | undefined> {
  try {
    const { rows } = await pool.query<{ webp: Buffer }>("SELECT webp FROM grimorio_monster_images WHERE versione = $1 AND misura = $2", [v, size]);
    return rows[0]?.webp;
  } catch (error) {
    if ((error as { code?: string }).code === MISSING_TABLE) return undefined;
    throw error;
  }
}

/** The card «Dalla redazione» that shows this version, if any. */
export async function pictureOwner(v: string): Promise<string | undefined> {
  try {
    const { rows } = await pool.query<{ id: string }>("SELECT id FROM grimorio_homebrew WHERE autore IS NULL AND scheda->'immagine'->>'v' = $1 LIMIT 1", [v]);
    return rows[0]?.id;
  } catch (error) {
    if ((error as { code?: string }).code === MISSING_TABLE) return undefined;
    throw error;
  }
}
