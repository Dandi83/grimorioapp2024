import artworks from "./lib/data/official-creature-art.json" with { type: "json" };

// Next limits remotePatterns to 50. Restrict the CDN by the actual source folders;
// detail pages still select only the individual URLs in the checked registry.
const artworkFolders = [...new Set(Object.values(artworks).map(({ src }) => {
  const url = new URL(src);
  if (url.origin !== "https://www.dndbeyond.com" || url.search ||
      !/^\/avatars\/thumbnails\/\d+\/\d+\//.test(url.pathname)) {
    throw new Error("Unexpected official artwork source");
  }
  return url.pathname.split("/").slice(0, 4).join("/") + "/**";
}))];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
    remotePatterns: artworkFolders.map(pathname => ({
      protocol: "https", hostname: "www.dndbeyond.com", pathname, search: "",
    })),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
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
