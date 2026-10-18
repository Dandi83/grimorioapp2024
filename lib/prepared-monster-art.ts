import trollLimb from "./data/prepared-art/arto-di-troll.webp";
import magmin from "./data/prepared-art/magmin.webp";
import dryad from "./data/prepared-art/driade.webp";
import type { StaticImageData } from "next/image";

// Device comparison only. Production retains its existing responsive pipeline.
const preparedArt: Record<string, StaticImageData> = {
  "arto-di-troll": trollLimb,
  magmin,
  driade: dryad,
};

export function getPreparedMonsterArt(id: string, environment = process.env.VERCEL_ENV) {
  if (environment !== "preview") return undefined;
  return Object.prototype.hasOwnProperty.call(preparedArt, id) ? preparedArt[id] : undefined;
}

