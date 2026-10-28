import { readFileSync } from "node:fs";

import { securityHeaders } from "./lib/security-headers.mjs";

// 2014 sheets moved to "<id>-2014" addresses: old shared links keep working.
// A plain 308 at routing level (lib/monster-id-aliases.ts renames saved favorites).
const renamedMonsterIds = JSON.parse(readFileSync(new URL("./lib/data/renamed-monster-ids.json", import.meta.url), "utf8"));
// Duplicate spell rows shown as one card: the hidden address opens the kept one.
const mergedSpellIds = JSON.parse(readFileSync(new URL("./lib/data/merged-spell-ids.json", import.meta.url), "utf8"));
// Spell addresses without proper names (lib/spell-public-id.ts): the old address answers 308, straight to the final one.
const publicSpellIds = JSON.parse(readFileSync(new URL("./lib/data/public-spell-ids.json", import.meta.url), "utf8")).ids;
const spellAddress = id => publicSpellIds[id] ?? id;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: { dynamic: 300, static: 300 },
  },
  images: {
    // WebP only: AVIF made images load slower and choppier on iPhone (18 October 2026).
    formats: ["image/webp"],
    minimumCacheTTL: 2678400,
  },
  async redirects() {
    return [
      ...renamedMonsterIds.map(id => ({ source: `/mostro/${id}`, destination: `/mostro/${id}-2014`, permanent: true })),
      ...Object.entries(mergedSpellIds).map(([id, kept]) => ({ source: `/spell/${id}`, destination: `/spell/${spellAddress(kept)}`, permanent: true })),
      ...Object.entries(publicSpellIds).map(([id, open]) => ({ source: `/spell/${id}`, destination: `/spell/${open}`, permanent: true })),
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
    ];
  },
};

export default nextConfig;
