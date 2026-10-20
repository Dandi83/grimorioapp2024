import { readFileSync } from "node:fs";

// 2014 sheets moved to "<id>-2014" addresses: old shared links keep working.
// A plain 308 at routing level (lib/monster-id-aliases.ts renames saved favorites).
const renamedMonsterIds = JSON.parse(readFileSync(new URL("./lib/data/renamed-monster-ids.json", import.meta.url), "utf8"));

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
    return renamedMonsterIds.map(id => ({ source: `/mostro/${id}`, destination: `/mostro/${id}-2014`, permanent: true }));
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          // No other site may show these pages inside a frame (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
