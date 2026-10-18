/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.dndbeyond.com",
        pathname: "/avatars/thumbnails/47138/549/1000/1000/638741963682090474.jpeg",
        search: "",
      },
      {
        protocol: "https",
        hostname: "www.dndbeyond.com",
        pathname: "/avatars/thumbnails/47139/138/1000/1000/638741964495949233.jpeg",
        search: "",
      },
    ],
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
