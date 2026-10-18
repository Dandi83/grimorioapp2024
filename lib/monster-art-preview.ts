import artworks from "./data/official-creature-art.json";

/** Source-checked artwork. Artwork is not SRD/Creative Commons content. */

export function getPreviewMonsterArt(id: string, environment = process.env.VERCEL_ENV) {
  if (environment !== "preview" && environment !== "production") return undefined;
  return Object.prototype.hasOwnProperty.call(artworks, id)
    ? artworks[id as keyof typeof artworks]
    : undefined;
}
