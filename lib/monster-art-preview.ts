/** Visual trial only. These illustrations are not SRD/Creative Commons assets. */
const artworks = {
  aboleth: {
    src: "https://www.dndbeyond.com/avatars/thumbnails/47138/549/1000/1000/638741963682090474.jpeg",
    width: 1000,
    height: 641,
    sourceUrl: "https://www.dndbeyond.com/monsters/5194867-aboleth",
    name: "Aboleth",
  },
  orsogufo: {
    src: "https://www.dndbeyond.com/avatars/thumbnails/47139/138/1000/1000/638741964495949233.jpeg",
    width: 800,
    height: 1000,
    sourceUrl: "https://www.dndbeyond.com/monsters/5195152-owlbear",
    name: "Orsogufo",
  },
} as const;

export function getPreviewMonsterArt(id: string, environment = process.env.VERCEL_ENV) {
  if (environment !== "preview") return undefined;
  return Object.prototype.hasOwnProperty.call(artworks, id)
    ? artworks[id as keyof typeof artworks]
    : undefined;
}
