import artworks from "./data/official-creature-art.json";

/** Source-checked artwork, kept in preview. Artwork is not SRD/Creative Commons content. */

export function getPreviewMonsterArt(id: string, environment = process.env.VERCEL_ENV) {
  if (environment !== "preview") return undefined;
  return Object.prototype.hasOwnProperty.call(artworks, id)
    ? artworks[id as keyof typeof artworks]
    : undefined;
}
